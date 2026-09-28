const AuditLog = require('../models/AuditLog');

/**
 * Catat log aktivitas sistem ke tabel audit_logs
 * @param {number|null} userId - ID user/staff yang melakukan aksi
 * @param {string} aktivitas - Deskripsi ringkas aktivitas
 * @param {object|null} dataSebelum - Snapshot data sebelum diubah
 * @param {object|null} dataSesudah - Snapshot data setelah diubah
 */
const logAudit = async (userId, aktivitas, dataSebelum = null, dataSesudah = null) => {
  try {
    await AuditLog.create({
      user_id: userId || null,
      aktivitas,
      data_sebelum: dataSebelum ? JSON.parse(JSON.stringify(dataSebelum)) : null,
      data_sesudah: dataSesudah ? JSON.parse(JSON.stringify(dataSesudah)) : null,
    });
  } catch (err) {
    console.error('Gagal mencatat audit log:', err.message);
  }
};

module.exports = { logAudit };
