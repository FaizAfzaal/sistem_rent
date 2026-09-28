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
 * GET /api/daily-checklist/history
 * Retrieves permanent history of daily checklist inspections grouped by date.
 */
const getHistory = async (req, res) => {
  try {
    const allRecords = await DailyChecklist.findAll({
      attributes: ['tanggal_pemeriksaan', 'waktu_pemeriksaan', 'status_ketersediaan', 'tipe_pemeriksaan', 'created_at', 'updated_at'],
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
          last_updated: rec.updated_at,
          total_alat: 0,
          total_tersedia: 0,
          total_tidak_tersedia: 0,
          total_stok_menipis: 0,
        };
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

module.exports = {
  getDailyChecklist,
  triggerManualCheck,
  getHistory,
};
