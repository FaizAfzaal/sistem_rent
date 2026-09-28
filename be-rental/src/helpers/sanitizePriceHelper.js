const isFinanceUser = (user) => {
  if (!user) return false;
  const rawRole = (user.role?.nama_role || '').toLowerCase();
  return ['admin_finance', 'finance', 'keuangan', 'admin finance'].includes(rawRole);
};

const sanitizePriceData = (data, user) => {
  if (isFinanceUser(user)) {
    return data;
  }

  const stripPrices = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date || obj instanceof RegExp || (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))) {
      return obj;
    }

    // Handle Sequelize instance
    let target = obj;
    if (typeof target.toJSON === 'function') {
      target = target.toJSON();
    }

    if (Array.isArray(target)) {
      return target.map(stripPrices);
    }

    const newObj = { ...target };

    // Price keys to delete for non-finance users
    const priceKeys = [
      'harga', 'harga_sewa', 'harga_sewa_per_hari', 'subtotal', 'total_harga',
      'jumlah_dp', 'sisa_pembayaran', 'uang_jaminan', 'denda', 'total_biaya_denda',
      'biaya_denda', 'denda_telat', 'denda_kerusakan', 'denda_kebersihan',
      'subtotal_denda', 'total_denda', 'nominal', 'jumlah_bayar', 'nominal_pembayaran'
    ];

    for (const key of priceKeys) {
      if (key in newObj) {
        delete newObj[key];
      }
    }

    for (const k in newObj) {
      if (newObj[k] && typeof newObj[k] === 'object') {
        newObj[k] = stripPrices(newObj[k]);
      }
    }

    return newObj;
  };

  return stripPrices(data);
};

module.exports = { isFinanceUser, sanitizePriceData };
