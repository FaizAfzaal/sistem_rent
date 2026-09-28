const express = require('express');
const router = express.Router();
const pickupController = require('../controllers/pickupController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadPickupPhotos } = require('../middleware/upload');

router.get('/ready', authenticate, pickupController.getReadyPickups);
router.get('/rented', authenticate, pickupController.getRentedPickups);
router.get('/history', authenticate, pickupController.getPickupHistory);
router.get('/available-equipment', authenticate, pickupController.getAvailableEquipment);

router.post(
  '/add-items',
  authenticate,
  authorize('admin', 'pengeluaran', 'ADMIN_PICKUP', 'ADMIN_BOOKING'),
  pickupController.addEquipmentToBooking
);

router.post(
  '/process',
  authenticate,
  authorize('admin', 'pengeluaran', 'ADMIN_PICKUP', 'ADMIN_BOOKING'),
  uploadPickupPhotos.array('photos', 5),
  pickupController.processPickup
);

router.post(
  '/cancel/:id',
  authenticate,
  authorize('admin', 'pengeluaran', 'ADMIN_PICKUP', 'ADMIN_BOOKING'),
  pickupController.cancelPickup
);

module.exports = router;
