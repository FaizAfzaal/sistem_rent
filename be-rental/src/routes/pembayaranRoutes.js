const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pembayaranController = require('../controllers/pembayaranController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadBukti } = require('../middleware/upload');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', pembayaranController.getAll);
router.get('/export/excel', authorize('admin', 'keuangan', 'finance', 'admin_finance'), pembayaranController.exportExcel);
router.get('/export/pdf', authorize('admin', 'keuangan', 'finance', 'admin_finance'), pembayaranController.exportPDF);
router.get('/:id', pembayaranController.getById);

router.post(
  '/',
  uploadBukti.single('bukti_bayar'),
  [
    body('booking_id').isInt({ min: 1 }).withMessage('Booking ID tidak valid'),
    body('metode')
      .isIn(['transfer', 'tunai', 'qris', 'kartu_kredit'])
      .withMessage('Metode pembayaran tidak valid'),
    body('jumlah').isDecimal().withMessage('Jumlah pembayaran tidak valid'),
  ],
  validate,
  pembayaranController.create
);

router.patch(
  '/:id/konfirmasi',
  authorize('admin', 'keuangan'),
  [
    body('status').isIn(['lunas', 'gagal']).withMessage('Status harus lunas atau gagal'),
    body('alasan_penolakan')
      .optional()
      .isString()
      .withMessage('Alasan penolakan harus berupa teks'),
  ],
  validate,
  pembayaranController.konfirmasi
);

router.patch(
  '/:id/upload-bukti',
  uploadBukti.single('bukti_bayar'),
  pembayaranController.uploadBukti
);

module.exports = router;
