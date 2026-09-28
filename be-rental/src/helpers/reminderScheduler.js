const { Booking, BookingDetail, Customer, User, ReturnTransaction } = require('../models');
const { getWIBDateTime } = require('./stockHelper');

/**
 * Pengecekan otomatis Notifikasi Keterlambatan dan Reminder 30-Menit Pengembalian Alat.
 */
const checkOverdueAndReminders = async () => {
  try {
    const nowWIB = getWIBDateTime();
    const nowMs = new Date(`${nowWIB.date}T${nowWIB.time}:00`).getTime();

    // Ambil semua booking yang aktif disewa
    const activeBookings = await Booking.findAll({
      where: {
        status: ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa'],
      },
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details' },
      ],
    });

    for (const booking of activeBookings) {
      const custName = booking.customer?.full_name || booking.user?.nama || 'Customer';
      const returnDate = booking.tanggal_selesai;
      const returnTime = booking.jam_selesai || '17:00';
      const scheduledMs = new Date(`${returnDate}T${returnTime}:00`).getTime();

      const diffMinutes = Math.floor((nowMs - scheduledMs) / (1000 * 60));

      // 1. Notifikasi Keterlambatan (jika diffMinutes > 0, misal 1 menit terlambat)
      if (diffMinutes > 0) {
        const alatNames = booking.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Heavy Equipment';
        // Logging overdue alert status
        // console.log(`[ALERT KETERLAMBATAN] Customer: ${custName}, Alat: ${alatNames}, Terlambat: ${diffMinutes} menit`);
      }

      // 2. Reminder 30 Menit Sebelum Pengembalian (diffMinutes antara -30 dan 0)
      if (diffMinutes >= -30 && diffMinutes <= 0) {
        const alatNames = booking.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Heavy Equipment';
        // console.log(`[REMINDER PENGEMBALIAN] Customer: ${custName}, Alat: ${alatNames}, Batas kembali: ${returnTime} WIB`);
      }
    }
  } catch (err) {
    // console.error('Error checking overdue & reminders:', err.message);
  }
};

module.exports = {
  checkOverdueAndReminders,
};
