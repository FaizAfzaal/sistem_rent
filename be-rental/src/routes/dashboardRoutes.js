const express = require('express');
const router = express.Router();
const { getOperationalDashboard } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/operational', authenticate, getOperationalDashboard);

module.exports = router;
