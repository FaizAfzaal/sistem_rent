const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rental_secret_key_2024');

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
    }

    if (user.status === 'nonaktif') {
      return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token sudah kadaluarsa' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
    }

    const rawRole = (req.user.role?.nama_role || '').toLowerCase();

    // Mapping role aliases to canonical RBAC roles
    const normalizedUserRoles = [rawRole];
    if (['admin', 'admin1', 'admin_1', 'superadmin', 'administrator'].includes(rawRole)) {
      normalizedUserRoles.push(
        'admin', 'admin1', 'admin_1', 'superadmin',
        'admin_booking', 'booking', 'admin booking',
        'admin_pickup', 'pickup', 'pengeluaran', 'admin pickup',
        'admin_return', 'return', 'penerimaan', 'admin return'
      );
    }
    if (['admin_booking', 'booking', 'admin booking'].includes(rawRole)) {
      normalizedUserRoles.push('admin_booking', 'booking');
    }
    if (['admin_pickup', 'pickup', 'pengeluaran', 'admin pickup'].includes(rawRole)) {
      normalizedUserRoles.push('admin_pickup', 'pickup', 'pengeluaran');
    }
    if (['admin_return', 'return', 'penerimaan', 'admin return'].includes(rawRole)) {
      normalizedUserRoles.push('admin_return', 'return', 'penerimaan');
    }
    if (['admin_finance', 'finance', 'keuangan', 'admin finance'].includes(rawRole)) {
      normalizedUserRoles.push('admin_finance', 'finance', 'keuangan');
    }

    const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase());

    const isMatch = normalizedUserRoles.some(r => normalizedAllowed.includes(r));

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak: Role '${req.user.role?.nama_role || 'User'}' tidak memiliki izin (permission) untuk fitur ini.`,
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
