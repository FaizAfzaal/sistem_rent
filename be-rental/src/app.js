const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:88',
  'http://127.0.0.1:88',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.startsWith('http://localhost:') ||
      cleanOrigin.startsWith('http://127.0.0.1:') ||
      cleanOrigin === 'http://localhost' ||
      cleanOrigin === 'http://127.0.0.1'
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files untuk upload
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const kategoriAlatRoutes = require('./routes/kategoriAlatRoutes');
const alatRoutes = require('./routes/alatRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const pickupRoutes = require('./routes/pickupRoutes');
const returnRoutes = require('./routes/returnRoutes');
const pembayaranRoutes = require('./routes/pembayaranRoutes');
const pengembalianRoutes = require('./routes/pengembalianRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const dailyChecklistRoutes = require('./routes/dailyChecklistRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/kategori-alat', kategoriAlatRoutes);
app.use('/api/alat', alatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/pickup', pickupRoutes);
app.use('/api/return', returnRoutes);
app.use('/api/pembayaran', pembayaranRoutes);
app.use('/api/pengembalian', pengembalianRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rental/document', documentRoutes);
app.use('/api/daily-checklist', dailyChecklistRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server berjalan dengan baik', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }

  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

module.exports = app;
