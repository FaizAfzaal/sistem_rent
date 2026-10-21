const express = require('express');
const router = express.Router();
const dailyChecklistController = require('../controllers/dailyChecklistController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadChecklist } = require('../middleware/upload');

const staffRoles = ['admin', 'keuangan', 'finance', 'admin_finance', 'ADMIN_BOOKING', 'ADMIN_PICKUP', 'ADMIN_RETURN'];

// All authenticated users can view daily checklist and history
router.get('/', authenticate, dailyChecklistController.getDailyChecklist);
router.get('/history', authenticate, dailyChecklistController.getHistory);

// Admin / staff actions
router.post('/manual-check', authenticate, authorize(...staffRoles), dailyChecklistController.triggerManualCheck);
router.patch('/:id/toggle-check', authenticate, authorize(...staffRoles), dailyChecklistController.toggleCheck);
router.post('/upload-foto-rak', authenticate, authorize(...staffRoles), uploadChecklist.single('foto_rak'), dailyChecklistController.uploadFotoRak);
router.post('/:id/upload-foto-alat', authenticate, authorize(...staffRoles), uploadChecklist.single('foto_fisik'), dailyChecklistController.uploadFotoAlat);

module.exports = router;
