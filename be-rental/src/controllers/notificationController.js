const { Op } = require('sequelize');
const { Booking, BookingDetail, Alat, User, Customer, Pembayaran, Invoice } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

const { getCurrentDateWIB } = require('../helpers/dateHelper');

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const roleName = (req.user?.role?.nama_role || req.user?.role || '').toLowerCase();
    const todayStr = getCurrentDateWIB();
    const now = new Date();

    const notifications = [];

    // Helper formatting function
    const addNotif = (id, title, desc, timeStr, unread, link, iconType, colorClass) => {
      notifications.push({
        id,
        title,
        desc,
        time: timeStr,
        unread,
        link,
        icon: iconType,
        color: colorClass,
      });
    };

    // ----------------------------------------------------
    // 1. ADMIN BOOKING (or General Admin)
    // ----------------------------------------------------
    if (['admin', 'admin_booking', 'booking', 'administrator'].includes(roleName)) {
      // Booking Baru
      const newBookings = await Booking.findAll({
        where: { status: { [Op.in]: ['BOOKING_DIBUAT', 'pending', 'MENUNGGU_BARANG_KELUAR', 'WAITING_PICKUP'] } },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [{ model: Customer, as: 'customer' }, { model: User, as: 'user' }],
      });

      newBookings.forEach((b, idx) => {
        const custName = b.customer?.full_name || b.user?.nama || 'Customer';
        addNotif(
          `bkg-new-${b.id}`,
          `Pemesanan Baru #${b.kode_booking}`,
          `Customer ${custName} membuat booking alat rental.`,
          new Date(b.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          true,
          '/admin/bookings',
          'ShoppingBag',
          'bg-indigo-50 text-indigo-600'
        );
      });

      // Customer Masuk Antrian Stok (MENUNGGU_KETERSEDIAAN)
      const queuedBookings = await Booking.findAll({
        where: { status: 'MENUNGGU_KETERSEDIAAN' },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [{ model: Customer, as: 'customer' }, { model: User, as: 'user' }],
      });

      queuedBookings.forEach((b) => {
        const custName = b.customer?.full_name || b.user?.nama || 'Customer';
        addNotif(
          `bkg-queue-${b.id}`,
          `Customer Masuk Antrian Stok #${b.kode_booking}`,
          `${custName} berada dalam antrian FIFO karena stok terbatas.`,
          'Baru',
          true,
          '/admin/bookings',
          'Clock',
          'bg-amber-50 text-amber-600'
        );
      });

      // Booking Dibatalkan
      const cancelledBookings = await Booking.findAll({
        where: { status: { [Op.in]: ['DIBATALKAN', 'dibatalkan', 'CANCELLED'] } },
        limit: 3,
        order: [['updated_at', 'DESC']],
      });

      cancelledBookings.forEach((b) => {
        addNotif(
          `bkg-cancel-${b.id}`,
          `Booking Dibatalkan #${b.kode_booking}`,
          `Transaksi booking telah dibatalkan (${b.alasan_pembatalan || 'Oleh admin/user'}).`,
          'Hari ini',
          false,
          '/admin/bookings',
          'XCircle',
          'bg-rose-50 text-rose-600'
        );
      });
    }

    // ----------------------------------------------------
    // 2. ADMIN PICKUP / PENGELUARAN BARANG
    // ----------------------------------------------------
    if (['admin', 'pickup', 'admin_pickup', 'pengeluaran'].includes(roleName)) {
      // Booking siap pickup
      const readyPickups = await Booking.findAll({
        where: { status: { [Op.in]: ['MENUNGGU_BARANG_KELUAR', 'WAITING_PICKUP', 'dikonfirmasi'] } },
        limit: 5,
        order: [['tanggal_mulai', 'ASC']],
        include: [{ model: Customer, as: 'customer' }, { model: User, as: 'user' }],
      });

      readyPickups.forEach((b) => {
        const custName = b.customer?.full_name || b.user?.nama || 'Customer';
        const isToday = b.tanggal_mulai === todayStr;
        addNotif(
          `pickup-ready-${b.id}`,
          isToday ? `🔥 Barang Harus Keluar Hari Ini #${b.kode_booking}` : `Barang Siap Pickup #${b.kode_booking}`,
          `Customer ${custName} dijadwalkan serah-terima pada ${b.tanggal_mulai}.`,
          isToday ? 'HARI INI' : b.tanggal_mulai,
          true,
          '/pickup/ready',
          'Truck',
          isToday ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
        );
      });
    }

    // ----------------------------------------------------
    // 3. ADMIN PENERIMAAN / PENGEMBALIAN BARANG
    // ----------------------------------------------------
    if (['admin', 'return', 'admin_return', 'penerimaan'].includes(roleName)) {
      // Barang sedang disewa & jatuh tempo / terlambat
      const activeRentals = await Booking.findAll({
        where: { status: { [Op.in]: ['SEDANG_DISEWA', 'BARANG_SEDANG_DISEWA', 'disewa', 'TERLAMBAT_KEMBALI'] } },
        limit: 6,
        order: [['tanggal_selesai', 'ASC']],
        include: [{ model: Customer, as: 'customer' }, { model: User, as: 'user' }],
      });

      activeRentals.forEach((b) => {
        const custName = b.customer?.full_name || b.user?.nama || 'Customer';
        const isToday = b.tanggal_selesai === todayStr;
        const isOverdue = b.tanggal_selesai < todayStr || b.status === 'TERLAMBAT_KEMBALI';

        if (isOverdue) {
          addNotif(
            `return-overdue-${b.id}`,
            `⚠️ Pengembalian Terlambat #${b.kode_booking}`,
            `Penyewaan ${custName} telah melewati jadwal pengembalian (${b.tanggal_selesai}).`,
            'TERLAMBAT',
            true,
            '/return/ready',
            'AlertTriangle',
            'bg-rose-50 text-rose-600'
          );
        } else if (isToday) {
          addNotif(
            `return-today-${b.id}`,
            `⏱️ Barang Harus Kembali Hari Ini #${b.kode_booking}`,
            `Rental ${custName} jatuh tempo hari ini pukul ${b.jam_selesai || '17:00'} WIB.`,
            'Pengembalian 30m',
            true,
            '/return/ready',
            'Clock',
            'bg-amber-50 text-amber-600'
          );
        }
      });

      // Menunggu Pemeriksaan Barang
      const inspectionBookings = await Booking.findAll({
        where: { status: 'PEMERIKSAAN_BARANG' },
        limit: 3,
      });

      inspectionBookings.forEach((b) => {
        addNotif(
          `return-inspect-${b.id}`,
          `Menunggu Pemeriksaan Alat #${b.kode_booking}`,
          `Alat telah diterima dan menunggu verifikasi fisik & denda.`,
          'Pemeriksaan',
          true,
          '/return/ready',
          'CheckCircle2',
          'bg-cyan-50 text-cyan-600'
        );
      });
    }

    // ----------------------------------------------------
    // 4. ADMIN FINANCE / KEUANGAN
    // ----------------------------------------------------
    if (['admin', 'keuangan', 'finance', 'admin_finance'].includes(roleName)) {
      // Pembayaran Masuk
      const pendingPayments = await Pembayaran.findAll({
        where: { status: 'menunggu' },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [{ model: Booking, as: 'booking' }],
      });

      pendingPayments.forEach((p) => {
        addNotif(
          `fin-pay-${p.id}`,
          `Verifikasi Pembayaran #${p.booking?.kode_booking || p.booking_id}`,
          `Pembayaran sebesar Rp ${Number(p.jumlah).toLocaleString('id-ID')} memerlukan konfirmasi.`,
          'Menunggu',
          true,
          '/finance/pembayaran',
          'CreditCard',
          'bg-indigo-50 text-indigo-600'
        );
      });

      // Invoice Baru
      const newInvoices = await Invoice.findAll({
        limit: 3,
        order: [['created_at', 'DESC']],
      });

      newInvoices.forEach((inv) => {
        addNotif(
          `fin-inv-${inv.id}`,
          `Invoice Penerbitan #${inv.nomor_invoice}`,
          `Invoice senilai Rp ${Number(inv.total_biaya).toLocaleString('id-ID')} telah dibuat.`,
          'Invoice',
          false,
          '/finance/invoice',
          'FileText',
          'bg-purple-50 text-purple-600'
        );
      });
    }

    // Fallback: If notifications empty, add helpful status item
    if (notifications.length === 0) {
      addNotif(
        'sys-welcome',
        'Sistem Rental Operational Active',
        'Semua transaksi rental berjalan tersinkronisasi dan aman.',
        'Sistem Normal',
        false,
        null,
        'CheckCircle2',
        'bg-emerald-50 text-emerald-600'
      );
    }

    return successResponse(res, 'Notifikasi berhasil diambil', notifications);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getNotifications,
};
