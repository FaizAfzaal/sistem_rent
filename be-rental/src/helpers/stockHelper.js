const { Op } = require('sequelize');
const { Alat, BookingDetail, Booking, AuditLog } = require('../models');

/**
 * Single Canonical Function untuk Perhitungan Ketersediaan Stok Alat Global.
 *
 * Stok Tersedia = Total Stok Alat - (Total Unit Aktif Disewa + Total Unit Pada Booking Yang Bentrok Tanggal)
 *
 * Mengabaikan:
 * - booking selesai (SELESAI_DISEWA, selesai, COMPLETED, PAID)
 * - booking dibatalkan (DIBATALKAN, dibatalkan, CANCELLED)
 * - alat yang sudah dikembalikan (BARANG_DIKEMBALIKAN)
 *
 * @param {number|string} alat_id
 * @param {string} tanggal_mulai Format 'YYYY-MM-DD'
 * @param {string} tanggal_selesai Format 'YYYY-MM-DD'
 * @param {number} quantity Jumlah unit yang ingin disewa/dicek
 * @param {number|string|null} exclude_booking_id ID booking yang diabaikan (opsional, saat update booking)
 * @param {object|null} transaction Opsi transaksi Sequelize
 */
const checkAvailability = async (
  alat_id,
  tanggal_mulai,
  tanggal_selesai,
  quantity = 1,
  exclude_booking_id = null,
  transaction = null
) => {
  const alat = await Alat.findByPk(alat_id, { transaction });
  if (!alat) {
    return {
      success: false,
      message: `Alat dengan ID ${alat_id} tidak ditemukan`,
      stok_total: 0,
      qty_terpakai: 0,
      sisa_stok: 0,
      is_available: false,
    };
  }

  // Active statuses consuming physical/reserved stock
  const activeStatuses = [
    'BOOKING_DIBUAT',
    'MENUNGGU_BARANG_KELUAR',
    'BARANG_KELUAR',
    'SEDANG_DISEWA',
    'PEMERIKSAAN_BARANG',
    'TERLAMBAT_KEMBALI',
    'pending',
    'dikonfirmasi',
    'disewa',
    'WAITING_PICKUP',
    'BARANG_SEDANG_DISEWA',
    'RENTED',
  ];

  const bookingWhere = {
    status: { [Op.in]: activeStatuses },
  };

  if (exclude_booking_id) {
    bookingWhere.id = { [Op.ne]: exclude_booking_id };
  }

  // Find overlapping booking details for this tool
  const overlappingDetails = await BookingDetail.findAll({
    where: {
      alat_id,
      [Op.or]: [
        {
          tanggal_mulai: { [Op.lte]: tanggal_selesai },
          tanggal_selesai: { [Op.gte]: tanggal_mulai },
        },
        {
          tanggal_mulai: null, // Fallback data tanpa tanggal per-item
        },
      ],
    },
    include: [
      {
        model: Booking,
        as: 'booking',
        where: bookingWhere,
        required: true,
      },
    ],
    transaction,
  });

  // Calculate total units currently occupied / reserved
  const qtyTerpakai = overlappingDetails.reduce((sum, d) => sum + (Number(d.qty) || 1), 0);
  const sisaStok = Math.max(0, Number(alat.stok || 0) - qtyTerpakai);

  const isStatusAvailable = ['TERSEDIA', 'tersedia', 'TERSEDIA_KEMBALI', 'baik'].includes(alat.status) || alat.status === 'TERSEDIA';
  const isAvailable = isStatusAvailable && sisaStok >= Number(quantity);

  const conflictDetails = overlappingDetails.map(d => {
    const bMulai = d.tanggal_mulai || d.booking?.tanggal_mulai || '-';
    const bSelesai = d.tanggal_selesai || d.booking?.tanggal_selesai || '-';
    const jMulai = d.jam_mulai || d.booking?.jam_mulai || '08:00';
    const jSelesai = d.jam_selesai || d.booking?.jam_selesai || '17:00';
    return `${bMulai} ${jMulai} WIB s/d ${bSelesai} ${jSelesai} WIB`;
  });

  const overlapPeriodStr = conflictDetails.length > 0 ? conflictDetails.join(', ') : `${tanggal_mulai} WIB s/d ${tanggal_selesai} WIB`;

  const detailedMessage = isAvailable ? 'Tersedia' :
    `Alat: ${alat.nama_alat} | Status: Tidak tersedia | Alasan: Sedang digunakan customer lain (${qtyTerpakai} unit terpakai dari total ${alat.stok} unit) | Periode penggunaan: ${overlapPeriodStr} (Timezone: Asia/Jakarta UTC+7)`;

  return {
    success: true,
    alat_id: Number(alat_id),
    nama_alat: alat.nama_alat,
    kode_alat: alat.kode_alat,
    stok_total: Number(alat.stok || 0),
    qty_terpakai: qtyTerpakai,
    sisa_stok: sisaStok,
    status_alat: alat.status,
    is_available: isAvailable,
    requested_qty: Number(quantity),
    detailed_message: detailedMessage,
  };
};

/**
 * Re-evaluasi Antrian Booking (FIFO) saat ada booking yang dibatalkan atau selesai.
 * Booking yang berstatus MENUNGGU_KETERSEDIAAN akan otomatis dinaikkan ke MENUNGGU_BARANG_KELUAR
 * jika stok untuk tanggal tersebut sudah mencukupi.
 */
const reevaluateQueueBookings = async () => {
  try {
    const queuedBookings = await Booking.findAll({
      where: {
        status: 'MENUNGGU_KETERSEDIAAN',
      },
      include: [
        {
          model: BookingDetail,
          as: 'details',
          include: [{ model: Alat, as: 'alat' }],
        },
      ],
      order: [['created_at', 'ASC']], // FIFO Priority by creation date
    });

    if (!queuedBookings.length) return;

    for (const b of queuedBookings) {
      let allItemsAvailable = true;

      for (const d of b.details || []) {
        const itemMulai = d.tanggal_mulai || b.tanggal_mulai;
        const itemSelesai = d.tanggal_selesai || b.tanggal_selesai;

        const check = await checkAvailability(d.alat_id, itemMulai, itemSelesai, d.qty, b.id);
        if (!check.is_available) {
          allItemsAvailable = false;
          break;
        }
      }

      if (allItemsAvailable) {
        await b.update({ status: 'MENUNGGU_BARANG_KELUAR' });
        await AuditLog.create({
          user_id: b.user_id,
          aktivitas: `Sistem Otomatis (FIFO): Status booking #${b.kode_booking} berubah dari MENUNGGU_KETERSEDIAAN menjadi MENUNGGU_BARANG_KELUAR karena stok telah tersedia.`,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error re-evaluating queue bookings:', err.message);
  }
};

/**
 * Helper untuk mendapatkan waktu WIB saat ini (UTC+7)
 */
const getWIBDate = () => {
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  return wibTime;
};

/**
 * Format Date ke String YYYY-MM-DD dalam WIB
 */
const getWIBDateString = () => {
  const d = getWIBDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Format Time HH:mm WIB
 */
const getWIBTimeString = () => {
  const d = getWIBDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} WIB`;
};

/**
 * Menghitung dan memperbarui status agregasi parent Booking dari seluruh status BookingDetail.
 */
const recalculateBookingStatus = async (bookingId) => {
  const { Booking, BookingDetail } = require('../models');
  const details = await BookingDetail.findAll({ where: { booking_id: bookingId } });
  if (!details || details.length === 0) return null;

  const statuses = details.map(d => d.status);
  let newStatus = 'WAITING_PICKUP';

  const allWaiting = statuses.every(s => ['WAITING_PICKUP', 'pending', 'dikonfirmasi', 'MENUNGGU_BARANG_KELUAR'].includes(s));
  const allSelesai = statuses.every(s => ['SELESAI_DISEWA', 'COMPLETED', 'selesai', 'RETURNED'].includes(s));
  const allRented = statuses.every(s => ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa'].includes(s));
  const allRentedOrDone = statuses.every(s => ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa', 'SELESAI_DISEWA', 'COMPLETED', 'selesai'].includes(s));

  const someRented = statuses.some(s => ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa'].includes(s));
  const someWaiting = statuses.some(s => ['WAITING_PICKUP', 'pending', 'dikonfirmasi', 'MENUNGGU_BARANG_KELUAR'].includes(s));
  const someSelesai = statuses.some(s => ['SELESAI_DISEWA', 'COMPLETED', 'selesai', 'RETURNED'].includes(s));

  if (allSelesai) {
    newStatus = 'SELESAI_DISEWA';
  } else if (allRented || allRentedOrDone) {
    newStatus = 'BARANG_SEDANG_DISEWA';
  } else if (someSelesai && (someRented || someWaiting)) {
    newStatus = 'PARTIAL_RETURN';
  } else if (someRented && someWaiting) {
    newStatus = 'PARTIAL_PICKUP';
  } else if (allWaiting) {
    newStatus = 'WAITING_PICKUP';
  }

  await Booking.update({ status: newStatus }, { where: { id: bookingId } });
  return newStatus;
};

const { getWIBDateTime, getCurrentDateWIB, getCurrentTimeWIB, addDaysStr } = require('./dateHelper');

module.exports = {
  checkAvailability,
  reevaluateQueueBookings,
  recalculateBookingStatus,
  getWIBDate,
  getWIBDateString,
  getWIBTimeString,
  getWIBDateTime,
  getCurrentDateWIB,
  getCurrentTimeWIB,
  addDaysStr,
};
