const { Op } = require('sequelize');
const { DailyChecklist, Alat, KategoriAlat, AuditLog } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');
const { runDailyChecklistProcess } = require('../helpers/dailyChecklistHelper');
const { getWIBDateString, getWIBTimeString } = require('../helpers/stockHelper');

/**
 * GET /api/daily-checklist
 * Retrieves daily checklist records for a given date with filters and dashboard metrics.
 * Auto-executes checklist evaluation for today if not already present.
 */
const getDailyChecklist = async (req, res) => {
  try {
    const { tanggal = getWIBDateString(), search, kategori_id, status } = req.query;

    // Check if checklist records exist for requested date
    let countForDate = await DailyChecklist.count({
      where: { tanggal_pemeriksaan: tanggal },
    });

    // If viewing today or requested date with no records, run evaluation process automatically
    if (countForDate === 0) {
      await runDailyChecklistProcess(tanggal, 'OTOMATIS');
    }

    // Build filter query for DailyChecklist table & joined Alat
    const whereChecklist = { tanggal_pemeriksaan: tanggal };
    if (status && status !== 'ALL') {
      whereChecklist.status_ketersediaan = status;
    }

    const whereAlat = {};
    if (kategori_id && kategori_id !== 'ALL') {
      whereAlat.kategori_id = kategori_id;
    }

    if (search && search.trim() !== '') {
      whereAlat[Op.or] = [
        { nama_alat: { [Op.like]: `%${search}%` } },
        { kode_alat: { [Op.like]: `%${search}%` } },
        { merek: { [Op.like]: `%${search}%` } },
      ];
    }

    const records = await DailyChecklist.findAll({
      where: whereChecklist,
      include: [
        {
          model: Alat,
          as: 'alat',
          where: whereAlat,
          required: true,
          include: [{ model: KategoriAlat, as: 'kategori' }],
        },
      ],
      order: [['id', 'ASC']],
    });

    // Also fetch ALL records for summary cards (unfiltered by search/kategori/status)
    const allDateRecords = await DailyChecklist.findAll({
      where: { tanggal_pemeriksaan: tanggal },
      include: [{ model: Alat, as: 'alat' }],
    });

    const summary = {
      tanggal_pemeriksaan: tanggal,
      terakhir_diperiksa: allDateRecords.length > 0 ? `${tanggal} ${allDateRecords[0].waktu_pemeriksaan}` : `${tanggal} 07:00:00 WIB`,
      total_aktif: allDateRecords.length,
      total_tersedia: allDateRecords.filter(r => r.status_ketersediaan === 'TERSEDIA').length,
      total_tidak_tersedia: allDateRecords.filter(r => r.status_ketersediaan === 'TIDAK_TERSEDIA').length,
      total_stok_menipis: allDateRecords.filter(r => r.status_ketersediaan === 'STOK_MENIPIS').length,
      total_tidak_aktif: allDateRecords.filter(r => r.status_ketersediaan === 'TIDAK_AKTIF').length,
      foto_rak: allDateRecords.find(r => r.foto_rak)?.foto_rak || null,
    };

    return successResponse(res, 'Data checklist harian berhasil diambil', {
      summary,
      items: records,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * POST /api/daily-checklist/manual-check
 * Trigger manual daily availability verification by admin.
 */
const triggerManualCheck = async (req, res) => {
  try {
    const { tanggal = getWIBDateString() } = req.body;

    const result = await runDailyChecklistProcess(tanggal, 'MANUAL');

    // Create Audit Log
    await AuditLog.create({
      user_id: req.user.id,
      aktivitas: `Admin ${req.user.nama} menjalankan pemeriksaan manual Checklist Harian Alat untuk tanggal ${tanggal}. Total alat: ${result.total_alat_diperiksa}.`,
    }).catch(() => {});

    return successResponse(res, `Pemeriksaan manual ketersediaan alat berhasil dilakukan untuk tanggal ${tanggal}`, result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * PATCH /api/daily-checklist/:id/toggle-check
 * Manually toggle or set checklist status for a specific tool item.
 */
const toggleCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_checked, keterangan } = req.body;

    const item = await DailyChecklist.findByPk(id, {
      include: [{ model: Alat, as: 'alat' }],
    });

    if (!item) {
      return errorResponse(res, 'Item checklist tidak ditemukan', 404);
    }

    const newIsChecked = typeof is_checked === 'boolean' ? is_checked : !item.is_checked;
    const waktuNow = getWIBTimeString();

    await item.update({
      is_checked: newIsChecked,
      waktu_pemeriksaan: waktuNow,
      tipe_pemeriksaan: 'MANUAL',
      keterangan: keterangan !== undefined ? keterangan : (newIsChecked ? 'Stok terverifikasi di kantor (manual checklist).' : 'Belum diverifikasi fisik di kantor.'),
    });

    await AuditLog.create({
      user_id: req.user.id,
      aktivitas: `Admin ${req.user.nama} mengubah status checklist ${item.alat?.nama_alat || 'Alat'} menjadi ${newIsChecked ? 'CHECKED' : 'UNCHECKED'}.`,
    }).catch(() => {});

    return successResponse(res, 'Status checklist berhasil diperbarui', item);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * POST /api/daily-checklist/upload-foto-rak
 * Upload documentation photo of storage racks for the daily checklist.
 */
const uploadFotoRak = async (req, res) => {
  try {
    const { tanggal = getWIBDateString() } = req.body;
    if (!req.file) {
      return errorResponse(res, 'File foto rak penyimpanan wajib diupload', 400);
    }

    const relativePath = req.file.path.replace(/\\/g, '/');

    // Update all daily_checklists records for this date
    await DailyChecklist.update(
      { foto_rak: relativePath },
      { where: { tanggal_pemeriksaan: tanggal } }
    );

    await AuditLog.create({
      user_id: req.user.id,
      aktivitas: `Admin ${req.user.nama} mengunggah foto dokumentasi rak alat untuk tanggal ${tanggal}.`,
    }).catch(() => {});

    return successResponse(res, 'Foto dokumentasi rak penyimpanan berhasil diunggah', {
      tanggal,
      foto_rak: relativePath,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * GET /api/daily-checklist/history
 * Retrieves permanent history of daily checklist inspections grouped by date.
 */
const getHistory = async (req, res) => {
  try {
    const allRecords = await DailyChecklist.findAll({
      attributes: ['tanggal_pemeriksaan', 'waktu_pemeriksaan', 'status_ketersediaan', 'tipe_pemeriksaan', 'foto_rak', 'created_at', 'updated_at'],
      order: [['tanggal_pemeriksaan', 'DESC']],
    });

    // Group by date
    const grouped = {};
    for (const rec of allRecords) {
      const dateKey = rec.tanggal_pemeriksaan;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          tanggal_pemeriksaan: dateKey,
          waktu_pemeriksaan: rec.waktu_pemeriksaan,
          tipe_pemeriksaan: rec.tipe_pemeriksaan,
          foto_rak: rec.foto_rak || null,
          last_updated: rec.updated_at,
          total_alat: 0,
          total_tersedia: 0,
          total_tidak_tersedia: 0,
          total_stok_menipis: 0,
        };
      }

      if (rec.foto_rak && !grouped[dateKey].foto_rak) {
        grouped[dateKey].foto_rak = rec.foto_rak;
      }
      grouped[dateKey].total_alat += 1;
      if (rec.status_ketersediaan === 'TERSEDIA') grouped[dateKey].total_tersedia += 1;
      else if (rec.status_ketersediaan === 'TIDAK_TERSEDIA') grouped[dateKey].total_tidak_tersedia += 1;
      else if (rec.status_ketersediaan === 'STOK_MENIPIS') grouped[dateKey].total_stok_menipis += 1;
    }

    const historyList = Object.values(grouped);

    return successResponse(res, 'Riwayat pemeriksaan harian berhasil diambil', historyList);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

/**
 * POST /api/daily-checklist/:id/upload-foto-alat
 * Upload physical photo proof for a specific tool checklist item.
 */
const uploadFotoAlat = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return errorResponse(res, 'File foto alat wajib diupload', 400);
    }

    const item = await DailyChecklist.findByPk(id, {
      include: [{ model: Alat, as: 'alat' }],
    });

    if (!item) {
      return errorResponse(res, 'Item checklist tidak ditemukan', 404);
    }

    const relativePath = req.file.path.replace(/\\/g, '/');

    await item.update({
      foto_fisik: relativePath,
      is_checked: true,
      waktu_pemeriksaan: getWIBTimeString(),
      tipe_pemeriksaan: 'MANUAL',
    });

    await AuditLog.create({
      user_id: req.user.id,
      aktivitas: `Admin ${req.user.nama} mengunggah foto fisik alat ${item.alat?.nama_alat || ''}.`,
    }).catch(() => {});

    return successResponse(res, 'Foto fisik alat berhasil diunggah', item);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getDailyChecklist,
  triggerManualCheck,
  getHistory,
  toggleCheck,
  uploadFotoRak,
  uploadFotoAlat,
};

