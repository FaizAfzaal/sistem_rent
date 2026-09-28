const { Invoice, InvoiceDetail, Booking, BookingDetail, Pembayaran, User, Customer, Alat } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { logAudit } = require('../helpers/auditLogger');
const { getCurrentDateWIB } = require('../helpers/dateHelper');
const { Op } = require('sequelize');

const ALLOWED_INVOICE_STATUSES = [
  'WAITING_PICKUP',
  'dikonfirmasi',
  'DIKONFIRMASI',
  'CONFIRMED',
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

/**
 * Otomatis membuat atau menyinkronkan Invoice & InvoiceDetail dari Booking Data
 */
const syncInvoiceFromBooking = async (bookingId, userId = null) => {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      { model: User, as: 'user' },
      { model: Customer, as: 'customer' },
      { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] },
      { model: Pembayaran, as: 'pembayaran' },
    ],
  });

  if (!booking) throw new Error('Booking tidak ditemukan');

  // Identify active/billed BookingDetail records (items already picked up or completed)
  const billedDetails = (booking.details || []).filter(d =>
    ['WAITING_PICKUP', 'dikonfirmasi', 'BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'SELESAI_DISEWA', 'COMPLETED', 'PAID', 'RETURNED', 'selesai'].includes(d.status)
  );

  // Strict guard: Invoice belum tersedia jika belum ada barang yang keluar/disewa dan status tidak aktif
  if (billedDetails.length === 0 && !ALLOWED_INVOICE_STATUSES.includes(booking.status)) {
    throw new Error('Invoice belum tersedia karena belum ada barang yang keluar/disewa.');
  }

  const activeBilledDetails = billedDetails.length > 0 ? billedDetails : (booking.details || []);

  const totalBilledSubtotal = activeBilledDetails.reduce((sum, d) => sum + Number(d.subtotal || 0), 0);
  const nomorInvoice = `INV-${booking.kode_booking || booking.id}`;

  // Hitung pembayaran DP & Total terkonfirmasi
  let totalDp = Number(booking.jumlah_dp || 0);
  let isLunas = ['lunas', 'dikonfirmasi', 'PAID', 'COMPLETED'].includes(booking.status_pembayaran);

  if (booking.pembayaran && booking.pembayaran.length > 0) {
    const totalBayarPeringkat = booking.pembayaran
      .filter(p => ['lunas', 'menunggu', 'konfirmasi'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.jumlah || 0), 0);
    if (totalBayarPeringkat > totalDp) {
      totalDp = totalBayarPeringkat;
    }
  }

  let statusBayarInvoice = 'BELUM_BAYAR';
  if (isLunas || totalDp >= totalBilledSubtotal) {
    statusBayarInvoice = 'LUNAS';
  } else if (totalDp > 0) {
    statusBayarInvoice = 'DP_DITERIMA';
  } else if (booking.status === 'dibatalkan') {
    statusBayarInvoice = 'DIBATALKAN';
  }

  let invoice = await Invoice.findOne({ where: { booking_id: booking.id } });

  const invoiceData = {
    booking_id: booking.id,
    nomor_invoice: nomorInvoice,
    tanggal_invoice: booking.tanggal_booking || getCurrentDateWIB(),
    subtotal: totalBilledSubtotal,
    diskon: Number(booking.discount_amount || 0),
    dp: totalDp,
    total: Math.max(0, totalBilledSubtotal - Number(booking.discount_amount || 0)),
    status_pembayaran: statusBayarInvoice,
  };

  if (invoice) {
    await invoice.update(invoiceData);
  } else {
    invoice = await Invoice.create(invoiceData);
  }

  // Hapus & Sync InvoiceDetail 100% dari activeBilledDetails
  await InvoiceDetail.destroy({ where: { invoice_id: invoice.id_invoice } });

  for (const d of activeBilledDetails) {
    await InvoiceDetail.create({
      invoice_id: invoice.id_invoice,
      booking_detail_id: d.id,
      alat_id: d.alat_id,
      qty: d.qty,
      harga: Number(d.harga || 0),
      subtotal: Number(d.subtotal || 0),
    });
  }

  if (userId) {
    await logAudit(userId, `Auto-sync Invoice ${nomorInvoice} dari Booking #${booking.kode_booking}`, null, invoice);
  }

  return await Invoice.findByPk(invoice.id_invoice, {
    include: [
      { model: Booking, as: 'booking', include: [{ model: User, as: 'user' }, { model: Customer, as: 'customer' }] },
      { model: InvoiceDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] },
    ],
  });
};

// GET /api/invoices
const getAllInvoices = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (search) {
      where[Op.or] = [
        { nomor_invoice: { [Op.like]: `%${search}%` } },
        { '$booking.kode_booking$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Booking, as: 'booking', include: [{ model: User, as: 'user' }, { model: Customer, as: 'customer' }] },
        { model: InvoiceDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] },
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data invoice berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/invoices/:id
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Booking, as: 'booking', include: [{ model: User, as: 'user' }, { model: Customer, as: 'customer' }] },
        { model: InvoiceDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] },
      ],
    });

    if (!invoice) return errorResponse(res, 'Invoice tidak ditemukan', 404);
    return successResponse(res, 'Data invoice berhasil diambil', invoice);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/invoices/booking/:bookingId
const getInvoiceByBookingId = async (req, res) => {
  try {
    let invoice = await Invoice.findOne({
      where: { booking_id: req.params.bookingId },
      include: [
        { model: Booking, as: 'booking', include: [{ model: User, as: 'user' }, { model: Customer, as: 'customer' }] },
        { model: InvoiceDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] },
      ],
    });

    if (!invoice) {
      invoice = await syncInvoiceFromBooking(req.params.bookingId, req.user?.id);
    }

    return successResponse(res, 'Data invoice booking berhasil diambil', invoice);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/invoices/generate/:bookingId
const generateInvoice = async (req, res) => {
  try {
    const invoice = await syncInvoiceFromBooking(req.params.bookingId, req.user?.id);
    return successResponse(res, 'Invoice resmi otomatis diterbitkan dari data booking', invoice, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/invoices/:id/pay-full
const payFullInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Booking, as: 'booking' }],
    });

    if (!invoice) return errorResponse(res, 'Invoice tidak ditemukan', 404);

    if (invoice.status_pembayaran === 'LUNAS' || invoice.booking?.status_pembayaran === 'lunas') {
      return errorResponse(res, 'Invoice ini sudah lunas, tidak dapat diubah lagi.', 400);
    }

    const totalTagihan = Number(invoice.total || invoice.booking?.total_harga || 0);
    const sisaSebelumnya = Number(invoice.booking?.sisa_pembayaran !== undefined ? invoice.booking.sisa_pembayaran : totalTagihan);
    const nominalLunas = sisaSebelumnya > 0 ? sisaSebelumnya : totalTagihan;

    // Update Invoice
    await invoice.update({
      dp: totalTagihan,
      status_pembayaran: 'LUNAS',
    });

    // Update Booking
    if (invoice.booking) {
      await invoice.booking.update({
        status_pembayaran: 'lunas',
        sisa_pembayaran: 0,
      });
    }

    // Record PaymentHistory
    const PaymentHistory = require('../models/PaymentHistory');
    const history = await PaymentHistory.create({
      invoice_id: invoice.id_invoice,
      user_id: req.user?.id || null,
      jumlah: nominalLunas,
      metode_pembayaran: req.body.metode_pembayaran || 'Transfer Bank',
      status: 'LUNAS',
      catatan: req.body.catatan || 'Pelunasan invoice (Tandai Lunas)',
    });

    await logAudit(
      req.user?.id,
      `Admin Finance menandai LUNAS Invoice #${invoice.nomor_invoice}`,
      { status: invoice.status_pembayaran, sisa: sisaSebelumnya },
      { status: 'LUNAS', total: totalTagihan, sisa: 0 }
    );

    return successResponse(res, `Invoice ${invoice.nomor_invoice} berhasil ditandai LUNAS`, {
      invoice,
      history,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/invoices/:id/record-payment
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { nominal, metode_pembayaran = 'Transfer Bank', catatan } = req.body;

    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Booking, as: 'booking' }],
    });

    if (!invoice) return errorResponse(res, 'Invoice tidak ditemukan', 404);

    if (invoice.status_pembayaran === 'LUNAS' || invoice.booking?.status_pembayaran === 'lunas') {
      return errorResponse(res, 'Invoice ini sudah lunas, tidak dapat ditambah pembayaran lagi.', 400);
    }

    const bayarNominal = Number(nominal || 0);
    if (bayarNominal <= 0) {
      return errorResponse(res, 'Nominal pembayaran harus lebih besar dari Rp 0', 400);
    }

    const totalTagihan = Number(invoice.total || invoice.booking?.total_harga || 0);
    const currentPaid = Number(invoice.dp || 0);
    const newTotalPaid = Math.min(totalTagihan, currentPaid + bayarNominal);
    const newSisaTagihan = Math.max(0, totalTagihan - newTotalPaid);

    let newStatusInvoice = 'DP_DITERIMA';
    let newStatusBooking = 'dp_lunas';

    if (newSisaTagihan <= 0 || newTotalPaid >= totalTagihan) {
      newStatusInvoice = 'LUNAS';
      newStatusBooking = 'lunas';
    }

    const buktiPath = req.file ? `uploads/payments/${req.file.filename}` : null;

    // Update Invoice & Booking
    await invoice.update({
      dp: newTotalPaid,
      status_pembayaran: newStatusInvoice,
    });

    if (invoice.booking) {
      await invoice.booking.update({
        status_pembayaran: newStatusBooking,
        sisa_pembayaran: newSisaTagihan,
      });
    }

    // Record PaymentHistory
    const PaymentHistory = require('../models/PaymentHistory');
    const history = await PaymentHistory.create({
      invoice_id: invoice.id_invoice,
      user_id: req.user?.id || null,
      jumlah: bayarNominal,
      metode_pembayaran,
      status: newStatusInvoice === 'LUNAS' ? 'LUNAS' : 'SEBAGIAN',
      bukti_pembayaran: buktiPath,
      catatan: catatan || `Pembayaran ${metode_pembayaran} sebesar Rp ${bayarNominal.toLocaleString('id-ID')}`,
    });

    await logAudit(
      req.user?.id,
      `Admin Finance mencatat pembayaran ${metode_pembayaran} Rp ${bayarNominal.toLocaleString('id-ID')} untuk Invoice #${invoice.nomor_invoice}`,
      { dibayar: currentPaid },
      { dibayar: newTotalPaid, status: newStatusInvoice }
    );

    return successResponse(res, `Pembayaran Rp ${bayarNominal.toLocaleString('id-ID')} berhasil dicatat`, {
      invoice,
      history,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/invoices/:id/history
const getPaymentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const PaymentHistory = require('../models/PaymentHistory');
    const User = require('../models/User');

    const histories = await PaymentHistory.findAll({
      where: { invoice_id: id },
      include: [{ model: User, as: 'admin', attributes: ['id', 'nama', 'email'] }],
      order: [['created_at', 'ASC']],
    });

    return successResponse(res, 'Riwayat pembayaran berhasil diambil', histories);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByBookingId,
  generateInvoice,
  syncInvoiceFromBooking,
  payFullInvoice,
  recordPayment,
  getPaymentHistory,
};
