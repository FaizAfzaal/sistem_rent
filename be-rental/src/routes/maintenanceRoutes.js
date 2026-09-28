const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, maintenanceController.getAll);
router.post('/', authenticate, authorize('admin', 'penerimaan', 'ADMIN_RETURN', 'ADMIN_BOOKING'), maintenanceController.create);
router.patch('/:id/status', authenticate, authorize('admin', 'penerimaan', 'ADMIN_RETURN', 'ADMIN_BOOKING'), maintenanceController.updateStatus);

module.exports = router;
