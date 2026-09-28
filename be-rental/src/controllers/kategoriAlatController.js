const { KategoriAlat, Alat } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');

// GET /api/kategori-alat
const getAll = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (search) {
      const { Op } = require('sequelize');
      where.nama_kategori = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await KategoriAlat.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data kategori alat berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/kategori-alat/:id
const getById = async (req, res) => {
  try {
    const kategori = await KategoriAlat.findByPk(req.params.id, {
      include: [{ model: Alat, as: 'alat' }],
    });
    if (!kategori) return errorResponse(res, 'Kategori tidak ditemukan', 404);
    return successResponse(res, 'Data kategori berhasil diambil', kategori);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/kategori-alat
const create = async (req, res) => {
  try {
    const { nama_kategori, deskripsi } = req.body;
    const kategori = await KategoriAlat.create({ nama_kategori, deskripsi });
    return successResponse(res, 'Kategori berhasil dibuat', kategori, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PUT /api/kategori-alat/:id
const update = async (req, res) => {
  try {
    const kategori = await KategoriAlat.findByPk(req.params.id);
    if (!kategori) return errorResponse(res, 'Kategori tidak ditemukan', 404);
    await kategori.update(req.body);
    return successResponse(res, 'Kategori berhasil diperbarui', kategori);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// DELETE /api/kategori-alat/:id
const remove = async (req, res) => {
  try {
    const kategori = await KategoriAlat.findByPk(req.params.id);
    if (!kategori) return errorResponse(res, 'Kategori tidak ditemukan', 404);

    const alatCount = await Alat.count({ where: { kategori_id: req.params.id } });
    if (alatCount > 0) {
      return errorResponse(res, 'Kategori tidak dapat dihapus karena masih memiliki alat', 400);
    }

    await kategori.destroy();
    return successResponse(res, 'Kategori berhasil dihapus');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
