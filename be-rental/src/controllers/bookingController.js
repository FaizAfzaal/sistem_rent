const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Booking, BookingDetail, Alat, User, Customer, KategoriAlat, Role, PickupTransaction, ReturnTransaction } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { generateKodeBooking } = require('../helpers/generateKode');
const { sanitizePriceData } = require('../helpers/sanitizePriceHelper');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// GET /api/bookings
const getAll = async (req, res) => {
  try {
    const { autoCancelUncollectedBookings } = require('../helpers/autoCancelHelper');
    await autoCancelUncollectedBookings();

    const { page = 1, size = 10, search, status, user_id } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (status) where.status = status;

    // Jika bukan staff (admin/keuangan/finance/pickup/return), hanya tampilkan booking milik user sendiri
    const currentRole = req.user.role?.nama_role;
    const isStaffRole = ['admin', 'keuangan', 'finance', 'admin_finance', 'pengeluaran', 'penerimaan', 'ADMIN_BOOKING', 'ADMIN_PICKUP', 'ADMIN_RETURN', 'ADMIN_FINANCE'].includes(currentRole);
    if (!isStaffRole) {
      where.user_id = req.user.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    if (search) {
      where[Op.or] = [
        { kode_booking: { [Op.like]: `%${search}%` } },
        { '$customer.full_name$': { [Op.like]: `%${search}%` } },
        { '$user.nama$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      limit,
      offset,
      subQuery: false,
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          include: [{ model: Alat, as: 'alat', include: [{ model: KategoriAlat, as: 'kategori' }] }],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
      ],
      order: [['created_at', 'DESC']],
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data booking berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/bookings/:id
const getById = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          include: [
            { model: Alat, as: 'alat', include: [{ model: KategoriAlat, as: 'kategori' }] },
            { model: PickupTransaction, as: 'pickup' },
            { model: ReturnTransaction, as: 'return' },
          ],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
      ],
    });

    if (!booking) return errorResponse(res, 'Booking tidak ditemukan', 404);

    // Non-staff hanya bisa lihat booking sendiri
    const currentRole = req.user.role?.nama_role;
    const isStaffRole = ['admin', 'keuangan', 'finance', 'admin_finance'].includes(currentRole);
    if (!isStaffRole && booking.user_id !== req.user.id) {
      return errorResponse(res, 'Akses tidak diizinkan', 403);
    }

    return successResponse(res, 'Data booking berhasil diambil', sanitizePriceData(booking, req.user));
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/bookings
const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      tanggal_mulai, tanggal_selesai, catatan, items, user_id, customer_id,
      opsi_pembayaran = 'dp', jumlah_dp: reqJumlahDp,
      jam_mulai = '08:00', jam_selesai = '17:00',
      uang_jaminan = 0, jenis_jaminan = 'KTP Asli',
      tanda_tangan_customer, tanda_tangan_admin,
      nama, email, nik, no_hp, alamat, kontak_darurat_nama, kontak_darurat_hp,
      pengambil_nama, pengambil_no_hp, pengambil_hubungan
    } = req.body;

    if (!items || items.length === 0) {
      await t.rollback();
      return errorResponse(res, 'Item booking tidak boleh kosong', 400);
    }

    const { getWIBDateTime } = require('../helpers/stockHelper');
    const nowWIB = getWIBDateTime();

    if (tanggal_mulai < nowWIB.date) {
      await t.rollback();
      return errorResponse(res, `Tanggal mulai sewa (${tanggal_mulai}) tidak boleh tanggal yang sudah lewat. Minimal hari ini WIB (${nowWIB.date}).`, 400);
    }

    const selectedCustId = customer_id || user_id;
    let targetUserId = req.user.id;
    let targetCustomerId = null;

    if (selectedCustId) {
      // Cek apakah selectedCustId milik Customer
      const custObj = await Customer.findByPk(selectedCustId, { transaction: t });
      if (custObj) {
        targetCustomerId = custObj.id;
        if (custObj.email) {
          const userMatch = await User.findOne({ where: { email: custObj.email }, transaction: t });
          if (userMatch) targetUserId = userMatch.id;
        }
      } else {
        const userObj = await User.findByPk(selectedCustId, { transaction: t });
        if (userObj) {
          targetUserId = userObj.id;
          let custMatch = await Customer.findOne({ where: { email: userObj.email }, transaction: t });
          if (!custMatch) {
            const { generateCustomerCode } = require('../helpers/generateKode');
            const code = await generateCustomerCode(Customer);
            custMatch = await Customer.create({
              customer_code: code,
              full_name: userObj.nama,
              phone: userObj.no_hp || '-',
              email: userObj.email,
              identity_number: userObj.nik || `ID-${userObj.id}`,
              address: userObj.alamat || '-',
            }, { transaction: t });
          }
          targetCustomerId = custMatch.id;
        }
      }
    }

    if (!targetCustomerId && (nama || email || nik)) {
      let cust = null;
      if (email) cust = await Customer.findOne({ where: { email }, transaction: t });
      if (!cust && nik) cust = await Customer.findOne({ where: { identity_number: nik }, transaction: t });
      if (!cust && nama) {
        const { generateCustomerCode } = require('../helpers/generateKode');
        const code = await generateCustomerCode(Customer);
        cust = await Customer.create({
          customer_code: code,
          full_name: nama,
          phone: no_hp || '-',
          email: email || null,
          identity_number: nik || `ID-${Date.now()}`,
          address: alamat || '-',
        }, { transaction: t });
      }
      if (cust) targetCustomerId = cust.id;
    }

    let totalHarga = 0;
    const detailData = [];
    const allStartDates = [];
    const allEndDates = [];
    let isAnyStockLimited = false;

    const { checkAvailability } = require('../helpers/stockHelper');

    for (const item of items) {
      const itemMulai = item.tanggal_mulai || tanggal_mulai;
      const itemSelesai = item.tanggal_selesai || tanggal_selesai;

      if (!itemMulai || !itemSelesai) {
        await t.rollback();
        return errorResponse(res, 'Tanggal mulai dan selesai wajib diisi untuk setiap alat', 400);
      }

      const itemDurasi = (new Date(itemSelesai) - new Date(itemMulai)) / (1000 * 60 * 60 * 24) + 1;
      if (itemDurasi <= 0) {
        await t.rollback();
        return errorResponse(res, 'Tanggal sewa tidak valid (tanggal selesai harus setelah tanggal mulai)', 400);
      }

      allStartDates.push(itemMulai);
      allEndDates.push(itemSelesai);

      const alat = await Alat.findByPk(item.alat_id, { transaction: t });
      if (!alat) {
        await t.rollback();
        return errorResponse(res, `Alat ID ${item.alat_id} tidak ditemukan`, 404);
      }
      if (alat.status === 'tidak_tersedia') {
        await t.rollback();
        return errorResponse(res, `Alat "${alat.nama_alat}" tidak tersedia`, 400);
      }

      // Hitung stok ketersediaan global
      const stockCheck = await checkAvailability(item.alat_id, itemMulai, itemSelesai, item.qty, null, t);
      if (!stockCheck.is_available) {
        isAnyStockLimited = true;
      }

      const itemJamMulai = item.jam_mulai || jam_mulai || '08:00';
      const itemJamSelesai = item.jam_selesai || jam_selesai || '17:00';
      const startMs = new Date(`${itemMulai}T${itemJamMulai}:00`).getTime();
      const endMs = new Date(`${itemSelesai}T${itemJamSelesai}:00`).getTime();
      const durasiJam = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));

      const subtotal = parseFloat(alat.harga_sewa) * item.qty * itemDurasi;
      totalHarga += subtotal;

      detailData.push({
        alat_id: item.alat_id,
        qty: item.qty,
        harga: alat.harga_sewa,
        tanggal_mulai: itemMulai,
        tanggal_selesai: itemSelesai,
        jam_mulai: itemJamMulai,
        jam_selesai: itemJamSelesai,
        status: 'WAITING_PICKUP',
        durasi_jam: durasiJam,
        kelengkapan: item.kelengkapan || 'Unit utama, tas & aksesoris standar',
        subtotal,
      });
    }

    // Hitung tanggal min/max top-level booking
    allStartDates.sort();
    allEndDates.sort();
    const minMulai = allStartDates[0];
    const maxSelesai = allEndDates[allEndDates.length - 1];

    let calcJumlahDp = 0;
    let calcSisaPembayaran = 0;
    let initialStatusPembayaran = 'belum_bayar';

    // Status booking awal berdasarkan ketersediaan stok (FIFO)
    let initialStatus = isAnyStockLimited ? 'MENUNGGU_KETERSEDIAAN' : 'WAITING_PICKUP';
    if (opsi_pembayaran === 'bayar_setelah_selesai') {
      calcJumlahDp = 0;
      calcSisaPembayaran = totalHarga;
      initialStatusPembayaran = 'bayar_di_akhir';
    } else if (opsi_pembayaran === 'batal_booking') {
      calcJumlahDp = 0;
      calcSisaPembayaran = 0;
      initialStatus = 'CANCELLED';
      initialStatusPembayaran = 'dibatalkan';
    } else if (opsi_pembayaran === 'lunas_awal') {
      calcJumlahDp = totalHarga;
      calcSisaPembayaran = 0;
      initialStatusPembayaran = 'belum_bayar';
    } else {
      // DP
      calcJumlahDp = reqJumlahDp ? parseFloat(reqJumlahDp) : Math.round(totalHarga * 0.3); // default DP 30%
      calcSisaPembayaran = Math.max(0, totalHarga - calcJumlahDp);
      initialStatusPembayaran = 'belum_bayar';
    }

    // Buat kode booking
    let kodeBooking;
    let isUnique = false;
    while (!isUnique) {
      kodeBooking = generateKodeBooking();
      const existing = await Booking.findOne({ where: { kode_booking: kodeBooking }, transaction: t });
      if (!existing) isUnique = true;
    }

    const booking = await Booking.create(
      {
        kode_booking: kodeBooking,
        user_id: targetUserId,
        customer_id: targetCustomerId,
        tanggal_booking: new Date(),
        tanggal_mulai: minMulai,
        tanggal_selesai: maxSelesai,
        total_harga: totalHarga,
        opsi_pembayaran,
        status_pembayaran: initialStatusPembayaran,
        jumlah_dp: calcJumlahDp,
        sisa_pembayaran: calcSisaPembayaran,
        jam_mulai,
        jam_selesai,
        uang_jaminan,
        jenis_jaminan,
        tanda_tangan_customer,
        tanda_tangan_admin,
        status: initialStatus,
        catatan,
        pengambil_nama,
        pengambil_no_hp,
        pengambil_hubungan,
      },
      { transaction: t }
    );

    const details = detailData.map((d) => ({ ...d, booking_id: booking.id }));
    await BookingDetail.bulkCreate(details, { transaction: t });

    // Initialize transaction snapshot checklists from Master Data Alat
    const { ensureBookingChecklists } = require('../helpers/checklistHelper');
    await ensureBookingChecklists(booking.id, t);

    await t.commit();

    const bookingData = await Booking.findByPk(booking.id, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        {
          model: BookingDetail,
          as: 'details',
          include: [{ model: Alat, as: 'alat' }],
        },
      ],
    });

    return successResponse(res, 'Booking berhasil dibuat', bookingData, 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

// PATCH /api/bookings/:id/status
const updateStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, { transaction: t });
    if (!booking) {
      await t.rollback();
      return errorResponse(res, 'Booking tidak ditemukan', 404);
    }

    const { status, alasan_pembatalan } = req.body;
    const validStatuses = ['pending', 'dikonfirmasi', 'permohonan_pembatalan', 'WAITING_PICKUP', 'BARANG_SEDANG_DISEWA', 'SELESAI_DISEWA', 'disewa', 'selesai', 'dibatalkan'];
    if (!validStatuses.includes(status)) {
      await t.rollback();
      return errorResponse(res, 'Status tidak valid', 400);
    }

    if (status === 'dibatalkan' && ['SELESAI_DISEWA', 'selesai', 'BARANG_SEDANG_DISEWA', 'disewa'].includes(booking.status)) {
      await t.rollback();
      return errorResponse(res, 'Booking yang sudah selesai disewa atau sedang disewa tidak dapat dibatalkan.', 400);
    }

    const prevStatus = booking.status;
    const details = await BookingDetail.findAll({ where: { booking_id: booking.id }, transaction: t });

    // Kurangi stok fisik saat alat mulai disewa (pending/dikonfirmasi -> disewa)
    if (status === 'disewa' && prevStatus !== 'disewa') {
      for (const detail of details) {
        const alat = await Alat.findByPk(detail.alat_id, { transaction: t });
        if (alat && alat.stok < detail.qty) {
          await t.rollback();
          return errorResponse(res, `Stok fisik alat "${alat.nama_alat}" tidak mencukupi`, 400);
        }
        await Alat.decrement('stok', { by: detail.qty, where: { id: detail.alat_id }, transaction: t });
      }
    }

    if (status === 'selesai' && prevStatus === 'disewa') {
      for (const detail of details) {
        await Alat.increment('stok', { by: detail.qty, where: { id: detail.alat_id }, transaction: t });
      }
    }

    if (status === 'dibatalkan' && !['dibatalkan', 'selesai'].includes(prevStatus)) {
      if (prevStatus === 'disewa') {
        for (const detail of details) {
          await Alat.increment('stok', { by: detail.qty, where: { id: detail.alat_id }, transaction: t });
        }
      }
    }

    const updateData = { status };
    if (status === 'dibatalkan') {
      updateData.alasan_pembatalan = alasan_pembatalan || null;
    } else if (booking.alasan_pembatalan) {
      updateData.alasan_pembatalan = null;
    }

    await booking.update(updateData, { transaction: t });
    await t.commit();

    if (['dibatalkan', 'DIBATALKAN', 'SELESAI_DISEWA', 'selesai'].includes(status)) {
      const { reevaluateQueueBookings } = require('../helpers/stockHelper');
      reevaluateQueueBookings().catch(() => {});
    }

    return successResponse(res, `Status booking diubah menjadi ${status}`, booking);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

// PATCH /api/bookings/:id/cancel
const customerCancel = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return errorResponse(res, 'Booking tidak ditemukan', 404);

    if (booking.user_id !== req.user.id) {
      return errorResponse(res, 'Akses tidak diizinkan', 403);
    }

    const { alasan_pembatalan } = req.body;
    const finalReason = alasan_pembatalan && alasan_pembatalan.trim() ? alasan_pembatalan : 'Pembatalan transaksi';

    if (booking.status === 'pending') {
      await booking.update({ status: 'dibatalkan', status_pembayaran: 'dibatalkan', alasan_pembatalan: finalReason }, { transaction: null });
      return successResponse(res, 'Booking berhasil dibatalkan', booking);
    }

    if (booking.status === 'dikonfirmasi') {
      await booking.update({ status: 'dibatalkan', status_pembayaran: 'dibatalkan', alasan_pembatalan: finalReason }, { transaction: null });
      return successResponse(res, 'Booking berhasil dibatalkan', booking);
    }

    if (booking.status === 'permohonan_pembatalan') {
      await booking.update({ alasan_pembatalan }, { transaction: null });
      return successResponse(res, 'Alasan permohonan pembatalan diperbarui', booking);
    }

    return errorResponse(res, 'Booking tidak dapat dibatalkan pada status saat ini', 400);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// DELETE /api/bookings/:id
const remove = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      await t.rollback();
      return errorResponse(res, 'Booking tidak ditemukan', 404);
    }

    if (!['pending', 'dibatalkan'].includes(booking.status)) {
      await t.rollback();
      return errorResponse(res, 'Hanya booking pending/dibatalkan yang dapat dihapus', 400);
    }

    await BookingDetail.destroy({ where: { booking_id: booking.id }, transaction: t });
    await booking.destroy({ transaction: t });
    await t.commit();

    return successResponse(res, 'Booking berhasil dihapus');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

// GET /api/bookings/kalender
// Semua user login bisa akses — mengembalikan booking aktif TANPA info customer
const getKalender = async (req, res) => {
  try {
    const { bulan, tahun, tanggal_mulai, tanggal_selesai } = req.query;

    const where = {
      status: { [Op.in]: ['pending', 'dikonfirmasi', 'permohonan_pembatalan', 'disewa'] },
    };

    // Filter range tanggal — support 2 mode:
    // 1. bulan+tahun (untuk kalender bulanan)
    // 2. tanggal_mulai+tanggal_selesai (untuk cek konflik booking)
    if (tanggal_mulai && tanggal_selesai) {
      // Ambil semua booking yang overlap dengan range ini
      where.tanggal_mulai  = { [Op.lte]: tanggal_selesai };
      where.tanggal_selesai = { [Op.gte]: tanggal_mulai };
    } else if (bulan && tahun) {
      const y  = parseInt(tahun);
      const m  = parseInt(bulan);
      const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay  = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
      where.tanggal_mulai  = { [Op.lte]: lastDay };
      where.tanggal_selesai = { [Op.gte]: firstDay };
    }

    const bookings = await Booking.findAll({
      where,
      attributes: ['id', 'kode_booking', 'tanggal_mulai', 'tanggal_selesai', 'status', 'total_harga', 'user_id'],
      include: [
        {
          model: BookingDetail,
          as: 'details',
          attributes: ['id', 'alat_id', 'qty', 'harga', 'subtotal'],
          include: [
            {
              model: Alat,
              as: 'alat',
              attributes: ['id', 'nama_alat', 'kode_alat', 'stok', 'gambar', 'kategori_id'],
              include: [{ model: KategoriAlat, as: 'kategori', attributes: ['id', 'nama_kategori'] }],
            },
          ],
        },
      ],
      order: [['tanggal_mulai', 'ASC']],
    });

    const currentRole   = req.user.role?.nama_role;
    const currentUserId = req.user.id;

    const result = bookings.map(b => {
      const plain = b.toJSON();
      if (currentRole === 'admin') return plain;
      return {
        ...plain,
        is_mine: plain.user_id === currentUserId,
        user_id: undefined,
      };
    });

    return successResponse(res, 'Data kalender berhasil diambil', result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Exports
const exportExcel = async (req, res) => {
  try {
    const where = {};
    const bookings = await Booking.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['nama'] }],
      order: [['created_at', 'DESC']],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bookings');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Kode', key: 'kode', width: 18 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Mulai', key: 'mula', width: 16 },
      { header: 'Selesai', key: 'selesai', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Total', key: 'total', width: 16 },
    ];

    bookings.forEach(b => {
      sheet.addRow({
        id: b.id,
        kode: b.kode_booking,
        customer: b.user?.nama || '-',
        mula: b.tanggal_mulai,
        selesai: b.tanggal_selesai,
        status: b.status,
        total: b.total_harga,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bookings_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const exportPDF = async (req, res) => {
  try {
    const bookings = await Booking.findAll({ include: [{ model: User, as: 'user', attributes: ['nama'] }], order: [['created_at', 'DESC']] });
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bookings_${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).text('Laporan Bookings', { align: 'center' });
    doc.moveDown(1);

    bookings.forEach(b => {
      doc.fontSize(10).text(`${b.kode_booking} • ${b.user?.nama || '-'} • ${b.tanggal_mulai} → ${b.tanggal_selesai} • ${b.status}`);
      doc.fontSize(9).text(`Total: Rp ${b.total_harga}`);
      doc.moveDown(0.6);
    });
    doc.end();
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getLogBook = async (req, res) => {
  try {
    const { autoCancelUncollectedBookings } = require('../helpers/autoCancelHelper');
    await autoCancelUncollectedBookings();

    const { getCurrentDateWIB } = require('../helpers/dateHelper');
    const todayStr = getCurrentDateWIB();
    const [todayYyyy, todayMm] = todayStr.split('-');

    const bulan = req.query.bulan ? parseInt(req.query.bulan) : parseInt(todayMm);
    const tahun = req.query.tahun ? parseInt(req.query.tahun) : parseInt(todayYyyy);

    const HARI_INDO = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU'];
    const daysInMonth = new Date(tahun, bulan, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(bulan).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${tahun}-${mm}-${dd}`;
      const dt = new Date(tahun, bulan - 1, d);
      const dayName = HARI_INDO[dt.getDay()];
      days.push({ day: d, dateStr, dayName });
    }

    const formatDateStr = (dateVal) => {
      if (!dateVal) return '';
      if (typeof dateVal === 'string') {
        return dateVal.substring(0, 10);
      }
      if (dateVal instanceof Date) {
        const yyyy = dateVal.getFullYear();
        const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
        const dd = String(dateVal.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return String(dateVal).substring(0, 10);
    };

    const getCustName = (b) => {
      return b.customer?.full_name || b.customer?.nama || b.user?.nama || b.pengambil_nama || 'Customer';
    };

    const alatList = await Alat.findAll({
      include: [{ model: KategoriAlat, as: 'kategori' }],
      order: [['id', 'ASC']],
    });

    const activeBookings = await Booking.findAll({
      where: {
        status: { [Op.notIn]: ['dibatalkan', 'CANCELLED', 'batal'] },
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'nama', 'no_hp', 'email'] },
        { model: Customer, as: 'customer', attributes: ['id', 'full_name', 'phone', 'email'] },
        { model: BookingDetail, as: 'details' },
      ],
    });

    const monthStartStr = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
    const monthEndStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const matrix = alatList.map((alat, idx) => {
      const alatBookings = {};
      const overbookedDays = [];
      const toolLanes = [];

      activeBookings.forEach(b => {
        const matchingDetails = (b.details || []).filter(d => String(d.alat_id) === String(alat.id));
        matchingDetails.forEach(det => {
          const startStr = formatDateStr(det.tanggal_mulai || b.tanggal_mulai);
          const endStr = formatDateStr(det.tanggal_selesai || b.tanggal_selesai);

          if (startStr && endStr && startStr <= monthEndStr && endStr >= monthStartStr) {
            toolLanes.push({
              booking_id: b.id,
              detail_id: det.id,
              kode_booking: b.kode_booking,
              customer_nama: getCustName(b),
              qty: det.qty || 1,
              status: b.status,
              status_pembayaran: b.status_pembayaran,
              opsi_pembayaran: b.opsi_pembayaran,
              jam_mulai: det.jam_mulai || b.jam_mulai || '08:00',
              jam_selesai: det.jam_selesai || b.jam_selesai || '17:00',
              tanggal_mulai: startStr,
              tanggal_selesai: endStr,
              total_harga: b.total_harga,
              jumlah_dp: b.jumlah_dp,
              sisa_pembayaran: b.sisa_pembayaran,
            });
          }
        });
      });

      days.forEach(dayObj => {
        const bookedForDay = [];
        activeBookings.forEach(b => {
          (b.details || []).forEach(det => {
            if (String(det.alat_id) !== String(alat.id)) return;
            const startStr = formatDateStr(det.tanggal_mulai || b.tanggal_mulai);
            const endStr = formatDateStr(det.tanggal_selesai || b.tanggal_selesai);
            if (!startStr || !endStr) return;

            if (startStr <= dayObj.dateStr && endStr >= dayObj.dateStr) {
              bookedForDay.push({
                booking_id: b.id,
                detail_id: det.id,
                kode_booking: b.kode_booking,
                customer_nama: getCustName(b),
                qty: det.qty || 1,
                status: b.status,
                status_pembayaran: b.status_pembayaran,
                opsi_pembayaran: b.opsi_pembayaran,
                jam_mulai: det.jam_mulai || b.jam_mulai || '08:00',
                jam_selesai: det.jam_selesai || b.jam_selesai || '17:00',
                tanggal_mulai: startStr,
                tanggal_selesai: endStr,
                total_harga: b.total_harga,
                jumlah_dp: b.jumlah_dp,
                sisa_pembayaran: b.sisa_pembayaran,
              });
            }
          });
        });

        const totalRentedQty = bookedForDay.reduce((sum, item) => sum + item.qty, 0);

        if (totalRentedQty > (alat.stok || 0)) {
          overbookedDays.push(dayObj.day);
        }

        if (bookedForDay.length > 0) {
          alatBookings[dayObj.day] = bookedForDay;
        } else {
          alatBookings[dayObj.day] = null;
        }
      });

      const isAvailable = ['tersedia', 'TERSEDIA', 'TERSEDIA_KEMBALI'].includes(alat.status);
      return {
        no: idx + 1,
        id: alat.id,
        kode_alat: alat.kode_alat,
        nama_alat: alat.nama_alat,
        merek: alat.merek || '-',
        kategori: alat.kategori?.nama_kategori || '-',
        pemilik: alat.pemilik || 'RIS',
        harga_sewa: alat.harga_sewa,
        stok: alat.stok || 0,
        status: isAvailable ? 'tersedia' : alat.status,
        kondisi: isAvailable ? 'baik' : alat.kondisi,
        lanes: toolLanes,
        overbooked_days: overbookedDays,
        is_overbooked: overbookedDays.length > 0,
        bookings: alatBookings,
      };
    });

    return successResponse(res, 'Data Logbook berhasil diambil', sanitizePriceData({
      bulan,
      tahun,
      total_days: daysInMonth,
      days,
      matrix,
    }, req.user));
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateDiscount = async (req, res) => {
  try {
    const { discount_amount, discount_percentage } = req.body;
    const booking = await Booking.findByPk(req.params.id, {
      include: [{ model: BookingDetail, as: 'details' }]
    });

    if (!booking) return errorResponse(res, 'Data booking tidak ditemukan', 404);

    const subtotalRental = Number(booking.total_harga || 0);

    let discAmount = 0;
    let discPct = 0;

    if (discount_amount !== undefined && discount_amount !== null && discount_amount !== '') {
      discAmount = Math.max(0, parseFloat(discount_amount || 0));
      if (subtotalRental > 0 && discAmount > subtotalRental) {
        return errorResponse(res, 'Nominal diskon tidak boleh melebihi subtotal rental', 400);
      }
      discPct = subtotalRental > 0 ? Number(((discAmount / subtotalRental) * 100).toFixed(2)) : 0;
    } else {
      discPct = Math.max(0, Math.min(100, parseFloat(discount_percentage || 0)));
      discAmount = Math.round(subtotalRental * (discPct / 100));
    }

    const uangJaminan = Number(booking.uang_jaminan || 0);
    const finalPay = Math.max(0, subtotalRental - discAmount + uangJaminan);

    const jumlahDp = Number(booking.jumlah_dp || 0);
    const sisaTagihan = Math.max(0, finalPay - jumlahDp);

    await booking.update({
      discount_percentage: discPct,
      discount_amount: discAmount,
      final_payment: finalPay,
      sisa_pembayaran: sisaTagihan,
    });

    const { Invoice } = require('../models');
    const inv = await Invoice.findOne({ where: { booking_id: booking.id } });
    if (inv) {
      await inv.update({
        total_biaya: finalPay,
        sisa_tagihan: Math.max(0, finalPay - Number(inv.jumlah_dibayar || 0)),
      });
    }

    return successResponse(res, `Diskon Rp ${discAmount.toLocaleString('id-ID')} berhasil diterapkan. Total pembayaran: Rp ${finalPay.toLocaleString('id-ID')}`, {
      booking_id: booking.id,
      subtotal: subtotalRental,
      discount_percentage: discPct,
      discount_amount: discAmount,
      final_payment: finalPay,
      sisa_pembayaran: sisaTagihan,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * Update tanggal rental booking (Admin)
 * PATCH /api/bookings/:id/dates
 */
const updateDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal_mulai, tanggal_selesai } = req.body;

    if (!tanggal_mulai || !tanggal_selesai) {
      return errorResponse(res, 'Tanggal mulai dan tanggal selesai wajib diisi', 400);
    }

    const tMulai = new Date(tanggal_mulai);
    const tSelesai = new Date(tanggal_selesai);

    if (isNaN(tMulai.getTime()) || isNaN(tSelesai.getTime())) {
      return errorResponse(res, 'Format tanggal tidak valid', 400);
    }

    if (tSelesai < tMulai) {
      return errorResponse(res, 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai', 400);
    }

    const booking = await Booking.findByPk(id, {
      include: [{ model: BookingDetail, as: 'details' }]
    });

    if (!booking) {
      return errorResponse(res, 'Data booking tidak ditemukan', 404);
    }

    const durasiHari = Math.max(1, Math.ceil((tSelesai - tMulai) / (1000 * 60 * 60 * 24)) + 1);

    // Recalculate detail subtotals
    let newTotalHarga = 0;
    if (booking.details && booking.details.length > 0) {
      for (const det of booking.details) {
        const itemHarga = Number(det.harga || 0);
        const itemQty = Number(det.qty || 1);
        const newSubtotal = itemHarga * itemQty * durasiHari;
        newTotalHarga += newSubtotal;

        await det.update({
          tanggal_mulai,
          tanggal_selesai,
          subtotal: newSubtotal,
        });
      }
    } else {
      newTotalHarga = Number(booking.total_harga || 0);
    }

    // Apply discount if any
    const discAmount = Number(booking.discount_amount || 0);
    const finalTotal = Math.max(0, newTotalHarga - discAmount);
    const dpPaid = Number(booking.jumlah_dp || 0);
    const sisaPembayaran = Math.max(0, finalTotal - dpPaid);

    await booking.update({
      tanggal_mulai,
      tanggal_selesai,
      total_harga: finalTotal,
      sisa_pembayaran: sisaPembayaran,
    });

    // Update associated invoice if exists
    const { Invoice } = require('../models');
    const inv = await Invoice.findOne({ where: { booking_id: booking.id } });
    if (inv) {
      const dibayar = Number(inv.jumlah_dibayar || 0);
      await inv.update({
        total_biaya: finalTotal,
        sisa_tagihan: Math.max(0, finalTotal - dibayar),
      });
    }

    return successResponse(res, `Tanggal booking ${booking.kode_booking} berhasil diperbarui (${tanggal_mulai} s/d ${tanggal_selesai})`, {
      booking_id: booking.id,
      kode_booking: booking.kode_booking,
      tanggal_mulai,
      tanggal_selesai,
      durasi: durasiHari,
      total_harga: finalTotal,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  updateStatus,
  customerCancel,
  updateDiscount,
  updateDates,
  remove,
  getKalender,
  getLogBook,
  exportExcel,
  exportPDF,
};
