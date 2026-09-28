const { Booking, BookingDetail, Alat, User, Customer, Pembayaran, PickupTransaction, ReturnTransaction, KategoriAlat } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');
const { getCurrentDateWIB } = require('../helpers/dateHelper');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// GET /api/dashboard/operational
const getOperationalDashboard = async (req, res) => {
  try {
    const { autoCancelUncollectedBookings } = require('../helpers/autoCancelHelper');
    await autoCancelUncollectedBookings();
    const todayStr = getCurrentDateWIB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total Booking & Growth
    const totalBooking = await Booking.count();
    const monthBookingCount = await Booking.count({
      where: {
        created_at: { [Op.gte]: startOfMonth }
      }
    });

    // 2. Barang Sedang Disewa
    const activeRentals = await Booking.findAll({
      where: {
        status: { [Op.in]: ['BARANG_SEDANG_DISEWA', 'RENTED', 'disewa', 'SEDANG_DISEWA', 'PARTIAL_PICKUP', 'PARTIAL_RETURN', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN'] }
      },
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }
      ]
    });
    const barangSedangDisewaCount = activeRentals.length;

    // 3. Menunggu Pengeluaran
    const waitingPickupCount = await Booking.count({
      where: {
        status: { [Op.in]: ['WAITING_PICKUP', 'dikonfirmasi', 'DIKONFIRMASI', 'PAID', 'SIAP_DIAMBIL', 'MENUNGGU_KELUAR'] }
      }
    });

    // 4. Pengembalian Hari Ini
    const returnsToday = await Booking.findAll({
      where: {
        tanggal_selesai: todayStr,
        status: { [Op.in]: ['BARANG_SEDANG_DISEWA', 'RENTED', 'disewa', 'SEDANG_DISEWA', 'PARTIAL_PICKUP', 'PARTIAL_RETURN', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN'] }
      },
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }
      ]
    });
    const pengembalianHariIniCount = returnsToday.length;

    // 5. Total Revenue & Monthly Revenue
    const paidPayments = await Pembayaran.findAll({ where: { status: 'lunas' } });
    const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.jumlah || 0), 0);

    const monthlyPaidPayments = await Pembayaran.findAll({
      where: {
        status: 'lunas',
        created_at: { [Op.gte]: startOfMonth }
      }
    });
    const monthlyRevenue = monthlyPaidPayments.reduce((sum, p) => sum + Number(p.jumlah || 0), 0);

    const pendingPayments = await Pembayaran.findAll({ where: { status: 'menunggu' } });
    const pendingPaymentCount = pendingPayments.length;
    const pendingPaymentTotal = pendingPayments.reduce((sum, p) => sum + Number(p.jumlah || 0), 0);

    // 6. Workflow Status Breakdown Pipeline (Synchronized 1:1 with real ready items & active details)
    const bookingBaruCount = await Booking.count({ where: { status: { [Op.in]: ['pending', 'PENDING', 'MENUNGGU_KONFIRMASI', 'WAITING_CONFIRMATION', 'menunggu_pembayaran'] } } });
    const dikonfirmasiCount = await Booking.count({ where: { status: { [Op.in]: ['dikonfirmasi', 'DIKONFIRMASI', 'CONFIRMED', 'APPROVED'] } } });

    // Menunggu Keluar: Bookings with BookingDetail ready for pickup today
    const readyPickupDetailsForPipeline = await BookingDetail.findAll({
      where: {
        tanggal_mulai: { [Op.lte]: todayStr },
        status: { [Op.in]: ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'] }
      },
      attributes: ['booking_id']
    });
    const menungguKeluarCount = new Set(readyPickupDetailsForPipeline.map(d => Number(d.booking_id))).size;

    // Sedang Disewa: Bookings with active rented BookingDetail items
    const activeRentedDetailsForPipeline = await BookingDetail.findAll({
      where: {
        status: { [Op.in]: ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa'] }
      },
      attributes: ['booking_id']
    });
    const sedangDisewaCount = new Set(activeRentedDetailsForPipeline.map(d => Number(d.booking_id))).size;

    const pengembalianCount = await Booking.count({ where: { status: { [Op.in]: ['SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'INSPEKSI'] } } });
    const selesaiCount = await Booking.count({ where: { status: { [Op.in]: ['SELESAI_DISEWA', 'SELESAI', 'selesai', 'COMPLETED', 'BARANG_KEMBALI'] } } });

    const pipeline = {
      bookingBaru: bookingBaruCount,
      dikonfirmasi: dikonfirmasiCount,
      menungguKeluar: menungguKeluarCount,
      sedangDisewa: sedangDisewaCount,
      pengembalian: pengembalianCount,
      selesai: selesaiCount,
    };

    // 7. Alert System
    const overdueBookings = await Booking.findAll({
      where: {
        tanggal_selesai: { [Op.lt]: todayStr },
        status: { [Op.in]: ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'PARTIAL_PICKUP', 'PARTIAL_RETURN'] }
      },
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }
      ]
    });

    const alerts = {
      jatuhTempoHariIni: pengembalianHariIniCount,
      invoiceBelumDibayar: pendingPaymentCount,
      terlambatKembali: overdueBookings.length,
    };

    // 8. Schedule Today Items (Only items actually waiting for pickup)
    const readyPickupDetails = await BookingDetail.findAll({
      where: {
        tanggal_mulai: { [Op.lte]: todayStr },
        status: { [Op.in]: ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'] }
      },
      attributes: ['booking_id']
    });

    const readyBookingIds = [...new Set(readyPickupDetails.map(d => Number(d.booking_id)))];

    const pickupsToday = await Booking.findAll({
      where: {
        id: { [Op.in]: readyBookingIds.length > 0 ? readyBookingIds : [0] }
      },
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }
      ]
    });

    const todaySchedule = [
      ...pickupsToday.map(b => {
        const readyItems = (b.details || []).filter(d =>
          d.tanggal_mulai <= todayStr && ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi'].includes(d.status)
        );
        return {
          id: `p-${b.id}`,
          kode_booking: b.kode_booking,
          alat: readyItems.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Heavy Equipment',
          customer: b.customer?.full_name || b.user?.nama || 'Customer',
          type: 'keluar',
          status_label: 'Keluar Hari Ini',
          status_color: 'blue',
        };
      }),
      ...returnsToday.map(b => ({
        id: `r-${b.id}`,
        kode_booking: b.kode_booking,
        alat: b.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Berat',
        customer: b.customer?.full_name || b.user?.nama || 'Customer',
        type: 'pengembalian',
        status_label: 'Pengembalian Hari Ini',
        status_color: 'amber',
      }))
    ];

    const overdueList = overdueBookings.map(b => {
      const daysOverdue = Math.max(1, Math.ceil((new Date(todayStr) - new Date(b.tanggal_selesai)) / 86400000));
      return {
        id: `o-${b.id}`,
        kode_booking: b.kode_booking,
        alat: b.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Berat',
        customer: b.customer?.full_name || b.user?.nama || 'Customer',
        tanggal_selesai: b.tanggal_selesai,
        daysOverdue,
        status_label: `TERLAMBAT ${daysOverdue} HARI`,
        status_color: 'rose',
      };
    });

    // 8b. Barang Selesai Disewa (Completed Rentals)
    const completedBookings = await Booking.findAll({
      where: {
        status: { [Op.in]: ['SELESAI_DISEWA', 'SELESAI', 'selesai', 'COMPLETED', 'BARANG_KEMBALI'] }
      },
      order: [['updated_at', 'DESC']],
      limit: 10,
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }
      ]
    });

    const completedList = completedBookings.map(b => ({
      id: `c-${b.id}`,
      kode_booking: b.kode_booking,
      alat: b.details?.map(d => d.alat?.nama_alat).filter(Boolean).join(', ') || 'Alat Heavy',
      customer: b.customer?.full_name || b.user?.nama || 'Customer',
      tanggal_selesai: b.tanggal_selesai,
      status_label: 'SELESAI',
      status_color: 'emerald',
    }));

    const scheduleList = [...todaySchedule, ...overdueList];

    // 9. Top Rented Equipment Leaderboard
    const topEquipmentRaw = await BookingDetail.findAll({
      attributes: [
        'alat_id',
        [sequelize.fn('COUNT', sequelize.col('booking_id')), 'total_tx']
      ],
      group: ['alat_id'],
      order: [[sequelize.literal('total_tx'), 'DESC']],
      limit: 5,
      include: [{ model: Alat, as: 'alat' }]
    });

    const topEquipment = topEquipmentRaw.map(t => ({
      alat_id: t.alat_id,
      nama_alat: t.alat?.nama_alat || 'Alat Heavy',
      kode_alat: t.alat?.kode_alat || '-',
      gambar: t.alat?.gambar || null,
      total_tx: Number(t.dataValues.total_tx || 0),
    }));

    // 10. Admin Activity Log Timeline
    const recentPickups = await PickupTransaction.findAll({
      limit: 3,
      order: [['created_at', 'DESC']],
      include: [{ model: Booking, as: 'booking' }]
    });

    const recentReturns = await ReturnTransaction.findAll({
      limit: 3,
      order: [['created_at', 'DESC']],
      include: [{ model: Booking, as: 'booking' }]
    });

    const recentBookingsList = await Booking.findAll({
      limit: 3,
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'user' }]
    });

    const activityLog = [
      ...recentPickups.map(p => ({
        id: `act-p-${p.id}`,
        time: p.pickup_time || '10:00',
        actor: 'Admin Pengeluaran',
        action: `Mengeluarkan barang untuk booking #${p.booking?.kode_booking || p.booking_id}`,
        timestamp: p.created_at,
        icon: 'truck',
        color: 'indigo'
      })),
      ...recentReturns.map(r => ({
        id: `act-r-${r.id}`,
        time: r.return_time || '16:00',
        actor: 'Admin Penerimaan',
        action: `Menerima pengembalian barang booking #${r.booking?.kode_booking || r.booking_id}`,
        timestamp: r.created_at,
        icon: 'rotate-ccw',
        color: 'emerald'
      })),
      ...recentBookingsList.map(b => ({
        id: `act-b-${b.id}`,
        time: new Date(b.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        actor: 'Admin Booking',
        action: `Membuat booking baru #${b.kode_booking} (${b.user?.nama || 'Customer'})`,
        timestamp: b.created_at,
        icon: 'shopping-cart',
        color: 'blue'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);

    // 11. Recent Bookings Table (Top 6)
    const recentBookings = await Booking.findAll({
      limit: 6,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'user' },
        { model: Customer, as: 'customer' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }
      ]
    });

    return successResponse(res, 'Data dashboard operasional berhasil diambil', {
      stats: {
        totalBooking,
        monthBookingCount,
        barangSedangDisewaCount,
        waitingPickupCount,
        pengembalianHariIniCount,
        totalRevenue,
        monthlyRevenue,
        pendingPaymentCount,
        pendingPaymentTotal,
      },
      pipeline,
      alerts,
      scheduleList,
      todaySchedule,
      overdueList,
      completedList,
      topEquipment,
      activityLog,
      recentBookings,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getOperationalDashboard,
};
