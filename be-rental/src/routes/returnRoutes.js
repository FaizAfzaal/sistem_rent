const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadReturnPhotos } = require('../middleware/upload');

router.get('/rented', authenticate, returnController.getRentedBookings);
router.get('/ready', authenticate, returnController.getReturnReadyBookings);
router.get('/history', authenticate, returnController.getReturnHistory);
router.get('/docs', authenticate, returnController.getReturnDocs);
router.get('/detail/:id', authenticate, returnController.getReturnDetail);

router.post(
  '/process',
  authenticate,
  authorize('admin', 'penerimaan', 'ADMIN_RETURN', 'ADMIN_BOOKING'),
  uploadReturnPhotos.array('photos', 5),
  returnController.processReturn
);

module.exports = router;
