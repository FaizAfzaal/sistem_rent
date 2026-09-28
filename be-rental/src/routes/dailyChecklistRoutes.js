const express = require('express');
const router = express.Router();
const dailyChecklistController = require('../controllers/dailyChecklistController');
const { authenticate, authorize } = require('../middleware/auth');

// All authenticated users can view daily checklist and history
router.get('/', authenticate, dailyChecklistController.getDailyChecklist);
router.get('/history', authenticate, dailyChecklistController.getHistory);

// Admin / staff can manually trigger verification check
router.post('/manual-check', authenticate, authorize('admin', 'keuangan', 'finance', 'admin_finance', 'ADMIN_BOOKING', 'ADMIN_PICKUP', 'ADMIN_RETURN'), dailyChecklistController.triggerManualCheck);

module.exports = router;
