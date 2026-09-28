const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const pengembalianController = require('../controllers/pengembalianController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', pengembalianController.getAll);
router.get('/:id', pengembalianController.getById);

router.post(
  '/',
  authorize('admin', 'keuangan'),
  [
    body('booking_id').isInt({ min: 1 }).withMessage('Booking ID tidak valid'),
    body('tanggal_pengembalian').isDate().withMessage('Tanggal pengembalian tidak valid'),
    body('kondisi_alat')
      .isIn(['baik', 'rusak_ringan', 'rusak_berat'])
      .withMessage('Kondisi alat tidak valid'),
  ],
  validate,
  pengembalianController.create
);

router.put('/:id', authorize('admin', 'keuangan'), pengembalianController.update);

module.exports = router;
