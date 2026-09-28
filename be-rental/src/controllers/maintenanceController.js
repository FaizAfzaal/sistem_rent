const { Maintenance, Alat, KategoriAlat } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { logAudit } = require('../helpers/auditLogger');
const sequelize = require('../config/database');

// GET /api/maintenance
const getAll = async (req, res) => {
  try {
    const { page = 1, size = 10, status } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await Maintenance.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: Alat, as: 'alat', include: [{ model: KategoriAlat, as: 'kategori' }] }],
      order: [['created_at', 'DESC']],
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data maintenance alat berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/maintenance
const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { alat_id, tanggal, kerusakan, deskripsi, biaya = 0, status = 'Perbaikan' } = req.body;

    if (!alat_id || !tanggal || !kerusakan) {
      await t.rollback();
      return errorResponse(res, 'Alat ID, Tanggal, dan Kerusakan wajib diisi', 400);
    }

    const alat = await Alat.findByPk(alat_id, { transaction: t });
    if (!alat) {
      await t.rollback();
      return errorResponse(res, 'Alat tidak ditemukan', 404);
    }

    const record = await Maintenance.create({
      alat_id,
      tanggal,
      kerusakan,
      deskripsi,
      biaya,
      status,
    }, { transaction: t });

    // Pindahkan status alat ke MAINTENANCE jika status perbaikan
    if (status === 'Perbaikan') {
      await alat.update({ status: 'MAINTENANCE', kondisi: 'rusak_berat' }, { transaction: t });
    } else if (status === 'Selesai' || status === 'Normal') {
      await alat.update({ status: 'TERSEDIA_KEMBALI', kondisi: 'baik' }, { transaction: t });
    }

    await t.commit();

    await logAudit(req.user?.id, `Mencatat maintenance alat "${alat.nama_alat}": ${kerusakan}`, null, record);

    return successResponse(res, 'Catatan maintenance alat berhasil dibuat', record, 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

// PATCH /api/maintenance/:id/status
const updateStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status, biaya, deskripsi } = req.body;
    const item = await Maintenance.findByPk(req.params.id, { transaction: t });
    if (!item) {
      await t.rollback();
      return errorResponse(res, 'Data maintenance tidak ditemukan', 404);
    }

    const prevData = { ...item.toJSON() };
    const updates = {};
    if (status) updates.status = status;
    if (biaya !== undefined) updates.biaya = biaya;
    if (deskripsi) updates.deskripsi = deskripsi;

    await item.update(updates, { transaction: t });

    const alat = await Alat.findByPk(item.alat_id, { transaction: t });
    if (alat) {
      if (status === 'Selesai' || status === 'Normal') {
        await alat.update({ status: 'TERSEDIA_KEMBALI', kondisi: 'baik' }, { transaction: t });
      } else if (status === 'Perbaikan') {
        await alat.update({ status: 'MAINTENANCE' }, { transaction: t });
      }
    }

    await t.commit();

    await logAudit(req.user?.id, `Mengubah status maintenance ID #${item.id} -> ${status}`, prevData, item);

    return successResponse(res, `Status maintenance diubah menjadi ${status}`, item);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

module.exports = { getAll, create, updateStatus };
