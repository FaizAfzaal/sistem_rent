const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin', 'keuangan', 'ADMIN_BOOKING'), getAuditLogs);

module.exports = router;
