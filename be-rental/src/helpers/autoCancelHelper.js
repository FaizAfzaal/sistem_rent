const { Booking, BookingDetail } = require('../models');
const { Op } = require('sequelize');
const { getCurrentDateWIB, addDaysStr } = require('./dateHelper');

/**
 * Otomatis membatalkan booking/detail yang barangnya tidak di-pickup
 * setelah melebihi 3 hari dari tanggal mulai (tanggal_mulai + 3 hari <= hari_ini).
 */
const autoCancelUncollectedBookings = async () => {
  try {
    const todayStr = getCurrentDateWIB();

    // Hitung tanggal batas (3 hari yang lalu dari hari ini WIB)
    // Contoh: Hari ini 2026-09-03, cutoff = 2026-08-31
    // Jika tanggal_mulai <= 2026-08-31 (misal 31 Aug, 30 Aug), maka sudah 3 hari atau lebih tidak di-pickup
    const cutoffDateStr = addDaysStr(todayStr, -3);

    // Cari semua BookingDetail yang belum di-pickup dan tanggal_mulai <= cutoffDateStr (lewat >= 3 hari)
    const uncollectedDetails = await BookingDetail.findAll({
      where: {
        status: { [Op.in]: ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi', 'MENUNGGU_KETERSEDIAAN'] },
        tanggal_mulai: { [Op.lte]: cutoffDateStr }
      }
    });

    if (uncollectedDetails.length === 0) {
      return { cancelledCount: 0 };
    }

    const affectedBookingIds = [...new Set(uncollectedDetails.map(d => d.booking_id))];

    // Update status BookingDetail menjadi 'dibatalkan'
    await BookingDetail.update(
      { status: 'dibatalkan' },
      {
        where: {
          id: { [Op.in]: uncollectedDetails.map(d => d.id) }
        }
      }
    );

    // Posisikan status parent Booking jika seluruh detailnya sudah tidak aktif / dibatalkan
    for (const bId of affectedBookingIds) {
      const b = await Booking.findByPk(bId, {
        include: [{ model: BookingDetail, as: 'details' }]
      });

      if (b) {
        const allDetailsCancelledOrFinished = (b.details || []).every(d =>
          ['dibatalkan', 'CANCELLED', 'SELESAI_DISEWA', 'COMPLETED', 'selesai'].includes(d.status)
        );

        if (allDetailsCancelledOrFinished) {
          const hasAnyCompleted = (b.details || []).some(d =>
            ['SELESAI_DISEWA', 'COMPLETED', 'selesai'].includes(d.status)
          );

          await b.update({
            status: hasAnyCompleted ? 'SELESAI_DISEWA' : 'dibatalkan',
            alasan_pembatalan: b.alasan_pembatalan || 'Batal Otomatis: Barang tidak di-pickup lebih dari 3 hari dari tanggal mulai rental'
          });
        }
      }
    }

    console.log(`[AUTO-CANCEL] Berhasil membatalkan ${uncollectedDetails.length} item booking yang tidak di-pickup >= 3 hari.`);
    return { cancelledCount: uncollectedDetails.length, affectedBookingIds };
  } catch (err) {
    console.error('Error in autoCancelUncollectedBookings:', err);
    return { cancelledCount: 0, error: err.message };
  }
};

module.exports = {
  autoCancelUncollectedBookings,
};

