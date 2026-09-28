const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const kategoriController = require('../controllers/kategoriAlatController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// GET bisa diakses semua user login
router.get('/', authenticate, kategoriController.getAll);
router.get('/:id', authenticate, kategoriController.getById);

// CUD admin & keuangan (master data owner)
router.post(
  '/',
  authenticate,
  authorize('admin', 'keuangan', 'finance', 'admin_finance'),
  [body('nama_kategori').notEmpty().withMessage('Nama kategori wajib diisi')],
  validate,
  kategoriController.create
);

router.put('/:id', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), kategoriController.update);

router.delete('/:id', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance'), kategoriController.remove);

module.exports = router;
