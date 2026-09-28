const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadBukti } = require('../middleware/upload');

router.get('/', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), invoiceController.getAllInvoices);
router.get('/:id', authenticate, invoiceController.getInvoiceById);
router.get('/booking/:bookingId', authenticate, invoiceController.getInvoiceByBookingId);
router.get('/:id/history', authenticate, invoiceController.getPaymentHistory);
router.post('/generate/:bookingId', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), invoiceController.generateInvoice);
router.post('/:id/pay-full', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), invoiceController.payFullInvoice);
router.post('/:id/record-payment', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), uploadBukti.single('bukti_pembayaran'), invoiceController.recordPayment);

module.exports = router;
