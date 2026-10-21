const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', bookingController.getAll);
router.get('/kalender', bookingController.getKalender);
router.get('/logbook', bookingController.getLogBook);
router.get('/export/excel', authorize('admin', 'keuangan', 'finance', 'admin_finance', 'ADMIN_BOOKING', 'ADMIN_PICKUP', 'ADMIN_RETURN'), bookingController.exportExcel);
router.get('/export/pdf', authorize('admin', 'keuangan', 'finance', 'admin_finance', 'ADMIN_BOOKING', 'ADMIN_PICKUP', 'ADMIN_RETURN'), bookingController.exportPDF);
router.get('/:id', bookingController.getById);

router.post(
  '/',
  [
    body('tanggal_mulai').optional({ checkFalsy: true }).isDate().withMessage('Tanggal mulai tidak valid'),
    body('tanggal_selesai').optional({ checkFalsy: true }).isDate().withMessage('Tanggal selesai tidak valid'),
    body('items').isArray({ min: 1 }).withMessage('Items harus berupa array dan tidak boleh kosong'),
    body('items.*.alat_id').isInt({ min: 1 }).withMessage('Alat ID tidak valid'),
    body('items.*.qty').isInt({ min: 1 }).withMessage('Qty minimal 1'),
  ],
  validate,
  bookingController.create
);

// Ubah status booking (Admin & Finance)
router.patch(
  '/:id/status',
  authorize('admin', 'keuangan', 'finance'),
  [
    body('status')
      .isIn(['pending', 'dikonfirmasi', 'permohonan_pembatalan', 'disewa', 'selesai', 'dibatalkan'])
      .withMessage('Status tidak valid'),
    body('alasan_pembatalan').optional({ checkFalsy: true }).isString().withMessage('Alasan pembatalan harus berupa teks'),
  ],
  validate,
  bookingController.updateStatus
);

router.patch(
  '/:id/cancel',
  [
    body('alasan_pembatalan').optional({ checkFalsy: true }).isString().withMessage('Alasan pembatalan harus berupa teks'),
  ],
  validate,
  bookingController.customerCancel
);

router.patch(
  '/:id/discount',
  authorize('admin', 'keuangan', 'finance'),
  [
    body('discount_amount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Diskon nominal harus angka non-negatif'),
    body('discount_percentage').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Diskon persentase harus angka 0 sampai 100'),
  ],
  validate,
  bookingController.updateDiscount
);

router.patch(
  '/:id/dates',
  authorize('admin', 'keuangan', 'finance'),
  [
    body('tanggal_mulai').isDate().withMessage('Tanggal mulai tidak valid'),
    body('tanggal_selesai').isDate().withMessage('Tanggal selesai tidak valid'),
  ],
  validate,
  bookingController.updateDates
);

// Hanya admin yang bisa hapus
router.delete('/:id', authorize('admin'), bookingController.remove);

module.exports = router;
