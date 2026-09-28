const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadCustomer } = require('../middleware/upload');

// All customer management endpoints require authentication & staff/admin role
router.get('/', authenticate, customerController.getAll);
router.get('/:id', authenticate, customerController.getById);

router.post(
  '/',
  authenticate,
  authorize('admin', 'staff', 'keuangan'),
  uploadCustomer.single('identity_photo'),
  customerController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff', 'keuangan'),
  uploadCustomer.single('identity_photo'),
  customerController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'staff', 'keuangan'),
  customerController.deleteSoft
);

router.patch(
  '/:id/restore',
  authenticate,
  authorize('admin', 'staff', 'keuangan'),
  customerController.restore
);

router.delete(
  '/:id/force',
  authenticate,
  authorize('admin'),
  customerController.forceDelete
);

module.exports = router;
