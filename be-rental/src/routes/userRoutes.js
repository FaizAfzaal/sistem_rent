const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadUser } = require('../middleware/upload');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('admin', 'keuangan', 'admin_finance', 'finance'));

router.get('/', userController.getAll);
router.get('/export/excel', userController.exportExcel);
router.get('/export/pdf', userController.exportPDF);
router.get('/:id', userController.getById);

router.post(
  '/',
  uploadUser.single('foto'),
  [
    body('nama').notEmpty().withMessage('Nama wajib diisi'),
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role_id').isInt({ min: 1 }).withMessage('Role ID tidak valid'),
  ],
  validate,
  userController.create
);

router.put('/:id', uploadUser.single('foto'), userController.update);

router.delete('/:id', userController.remove);

router.patch('/:id/status', userController.toggleStatus);

module.exports = router;
