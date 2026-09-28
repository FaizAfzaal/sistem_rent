const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const alatController = require('../controllers/alatController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAlat } = require('../middleware/upload');
const validate = require('../middleware/validate');

// GET bisa diakses semua user login
router.get('/', authenticate, alatController.getAll);
router.get('/:id/check-availability', authenticate, alatController.checkAvailability);
router.get('/:id', authenticate, alatController.getById);
router.get('/export/excel', authenticate, authorize('admin'), alatController.exportExcel);
router.get('/export/pdf', authenticate, authorize('admin'), alatController.exportPDF);

// CUD admin & keuangan (master data owner)
router.post(
  '/',
  authenticate,
  authorize('admin', 'keuangan', 'finance', 'admin_finance'),
  uploadAlat.single('gambar'),
  [
    body('kategori_id').isInt({ min: 1 }).withMessage('Kategori ID tidak valid'),
    body('nama_alat').notEmpty().withMessage('Nama alat wajib diisi'),
    body('harga_sewa').isDecimal().withMessage('Harga sewa tidak valid'),
  ],
  validate,
  alatController.create
);

router.put('/:id', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), uploadAlat.single('gambar'), alatController.update);

router.delete('/:id', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), alatController.remove);

router.patch('/:id/stok', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), alatController.updateStok);

module.exports = router;
