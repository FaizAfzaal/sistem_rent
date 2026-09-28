const { Op } = require('sequelize');
const { Pembayaran, Booking, BookingDetail, User } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { syncInvoiceFromBooking } = require('./invoiceController');
const { logAudit } = require('../helpers/auditLogger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// GET /api/pembayaran
const getAll = async (req, res) => {
  try {
    const { page = 1, size = 10, status, booking_id } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (status) where.status = status;
    if (booking_id) where.booking_id = booking_id;

    // Admin & Keuangan bisa lihat semua pembayaran, Customer hanya miliknya sendiri
    const currentRole = req.user.role?.nama_role;
    const bookingWhere = {};
    if (currentRole !== 'admin' && currentRole !== 'keuangan') {
      bookingWhere.user_id = req.user.id;
    }

    const { count, rows } = await Pembayaran.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Booking,
          as: 'booking',
          where: bookingWhere,
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data pembayaran berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/pembayaran/:id
const getById = async (req, res) => {
  try {
    const pembayaran = await Pembayaran.findByPk(req.params.id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
      ],
    });

    if (!pembayaran) return errorResponse(res, 'Pembayaran tidak ditemukan', 404);

    const currentRole = req.user.role?.nama_role;
    if (currentRole !== 'admin' && currentRole !== 'keuangan' && pembayaran.booking?.user_id !== req.user.id) {
      return errorResponse(res, 'Akses tidak diizinkan', 403);
    }

    return successResponse(res, 'Data pembayaran berhasil diambil', pembayaran);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/pembayaran
const create = async (req, res) => {
  try {
    const { booking_id, metode, jumlah, tipe_pembayaran, status: requestedStatus } = req.body;
    const bukti_bayar = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const booking = await Booking.findByPk(booking_id);
    if (!booking) return errorResponse(res, 'Booking tidak ditemukan', 404);

    const payType = tipe_pembayaran || (booking.opsi_pembayaran === 'dp' && booking.status_pembayaran === 'belum_bayar' ? 'dp' : 'lunas');

    // Strict guard: Pembayaran lunas / pelunasan final belum dapat diproses jika barang belum keluar
    const ALLOWED_PAYMENT_STATUSES = [
      'BARANG_SEDANG_DISEWA',
      'SEDANG_DISEWA',
      'SEBAGIAN_DISEWA',
      'PARTIAL_PICKUP',
      'PARTIAL_RETURN',
      'SIAP_DIKEMBALIKAN',
      'WAITING_RETURN',
      'SELESAI_DISEWA',
      'COMPLETED',
      'PAID',
      'RETURNED',
      'selesai'
    ];

    const hasPickedUpDetails = await BookingDetail.findOne({
      where: {
        booking_id,
        status: { [Op.in]: ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'SELESAI_DISEWA', 'BARANG_DIKEMBALIKAN'] }
      }
    });

    if (payType === 'lunas' && !hasPickedUpDetails && !ALLOWED_PAYMENT_STATUSES.includes(booking.status)) {
      return errorResponse(res, 'Invoice dan pembayaran pelunasan belum tersedia karena belum ada barang yang keluar.', 400);
    }

    const currentRole = req.user.role?.nama_role;
    const isStaff = ['admin', 'keuangan', 'finance'].includes(currentRole);
    const initialStatus = isStaff && requestedStatus ? requestedStatus : 'menunggu';

    const pembayaran = await Pembayaran.create({
      booking_id,
      tanggal_bayar: new Date(),
      metode: metode || 'transfer',
      jumlah: jumlah || (payType === 'dp' ? booking.jumlah_dp : (booking.sisa_pembayaran || booking.total_harga)),
      tipe_pembayaran: payType,
      bukti_bayar,
      status: initialStatus,
    });

    if (initialStatus === 'lunas') {
      await booking.update({
        status: 'dikonfirmasi',
        status_pembayaran: 'lunas',
        sisa_pembayaran: 0,
      });
    }

    return successResponse(res, 'Pembayaran berhasil dibuat', pembayaran, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PATCH /api/pembayaran/:id/konfirmasi
const konfirmasi = async (req, res) => {
  try {
    const pembayaran = await Pembayaran.findByPk(req.params.id, {
      include: [{ model: Booking, as: 'booking' }],
    });

    if (!pembayaran) return errorResponse(res, 'Pembayaran tidak ditemukan', 404);

    const { status, alasan_penolakan } = req.body; // 'lunas' atau 'gagal'
    if (!['lunas', 'gagal'].includes(status)) {
      return errorResponse(res, 'Status harus lunas atau gagal', 400);
    }

    if (status === 'gagal' && (!alasan_penolakan || alasan_penolakan.trim().length === 0)) {
      return errorResponse(res, 'Alasan penolakan wajib diisi untuk pembayaran gagal', 400);
    }

    const prevStatus = pembayaran.status;
    const updateData = { status };
    if (status === 'gagal') {
      updateData.alasan_penolakan = alasan_penolakan;
    } else {
      updateData.alasan_penolakan = null;
    }

    await pembayaran.update(updateData);

    if (pembayaran.booking_id) {
      if (status === 'lunas' && pembayaran.booking) {
        const b = pembayaran.booking;
        const amountPaid = parseFloat(pembayaran.jumlah);
        const currentSisa = parseFloat(b.sisa_pembayaran || b.total_harga);
        const newSisa = Math.max(0, currentSisa - amountPaid);

        let newStatusPembayaran = b.status_pembayaran;
        if (pembayaran.tipe_pembayaran === 'dp') {
          newStatusPembayaran = newSisa <= 0 ? 'lunas' : 'dp_lunas';
        } else {
          newStatusPembayaran = newSisa <= 0 ? 'lunas' : b.status_pembayaran;
        }

        await b.update({
          status: 'dikonfirmasi',
          status_pembayaran: newStatusPembayaran,
          sisa_pembayaran: newSisa,
        });
      }

      // Otomatis terbitkan/sync Invoice & InvoiceDetail 100% dari booking
      await syncInvoiceFromBooking(pembayaran.booking_id, req.user?.id);
    }

    await logAudit(
      req.user?.id,
      `Admin Finance mengubah status pembayaran #${pembayaran.id} (Booking #${pembayaran.booking?.kode_booking || pembayaran.booking_id}) dari ${prevStatus} menjadi ${status}`,
      { status: prevStatus },
      { status }
    );

    return successResponse(res, `Pembayaran berhasil dikonfirmasi sebagai ${status}`, pembayaran);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PATCH /api/pembayaran/:id/upload-bukti
const uploadBukti = async (req, res) => {
  try {
    const pembayaran = await Pembayaran.findByPk(req.params.id);
    if (!pembayaran) return errorResponse(res, 'Pembayaran tidak ditemukan', 404);

    if (!req.file) return errorResponse(res, 'File bukti bayar diperlukan', 400);

    const bukti_bayar = req.file.path.replace(/\\/g, '/');
    await pembayaran.update({ bukti_bayar, tanggal_bayar: new Date() });

    return successResponse(res, 'Bukti pembayaran berhasil diupload', pembayaran);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getAll, getById, create, konfirmasi, uploadBukti };

// Exports
const exportExcel = async (req, res) => {
  try {
    const where = {};
    const rows = await Pembayaran.findAll({ include: [{ model: Booking, as: 'booking', include: [{ model: User, as: 'user', attributes: ['nama'] }] }], order: [['created_at', 'DESC']] });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pembayaran');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Booking', key: 'booking', width: 18 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Tanggal', key: 'tanggal', width: 18 },
      { header: 'Metode', key: 'metode', width: 14 },
      { header: 'Jumlah', key: 'jumlah', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    rows.forEach(p => sheet.addRow({ id: p.id, booking: p.booking?.kode_booking || '-', customer: p.booking?.user?.nama || '-', tanggal: p.tanggal_bayar, metode: p.metode, jumlah: p.jumlah, status: p.status }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pembayaran_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { return errorResponse(res, error.message); }
};

const exportPDF = async (req, res) => {
  try {
    const rows = await Pembayaran.findAll({ include: [{ model: Booking, as: 'booking', include: [{ model: User, as: 'user', attributes: ['nama'] }] }], order: [['created_at', 'DESC']] });
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pembayaran_${Date.now()}.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).text('Laporan Pembayaran', { align: 'center' }); doc.moveDown(1);
    rows.forEach(p => { doc.fontSize(10).text(`${p.id} • ${p.booking?.kode_booking || '-'} • ${p.booking?.user?.nama || '-'} • ${p.tanggal_bayar} • ${p.metode} • Rp ${p.jumlah} • ${p.status}`); doc.moveDown(0.4); });
    doc.end();
  } catch (error) { return errorResponse(res, error.message); }
};

module.exports = { getAll, getById, create, konfirmasi, uploadBukti, exportExcel, exportPDF };
