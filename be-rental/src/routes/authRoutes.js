const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { uploadUser } = require('../middleware/upload');
const validate = require('../middleware/validate');

router.post(
  '/register',
  [
    body('nama').notEmpty().withMessage('Nama wajib diisi'),
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Format email tidak valid'),
    body('password').notEmpty().withMessage('Password wajib diisi'),
  ],
  validate,
  authController.login
);

router.get('/profile', authenticate, authController.profile);

router.put('/profile', authenticate, uploadUser.single('foto'), authController.updateProfile);

router.put(
  '/change-password',
  authenticate,
  [
    body('password_lama').notEmpty().withMessage('Password lama wajib diisi'),
    body('password_baru').isLength({ min: 6 }).withMessage('Password baru minimal 6 karakter'),
  ],
  validate,
  authController.changePassword
);

module.exports = router;
