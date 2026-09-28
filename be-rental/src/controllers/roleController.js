const { Role } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

// GET /api/roles
const getAll = async (req, res) => {
  try {
    const roles = await Role.findAll();
    return successResponse(res, 'Data roles berhasil diambil', roles);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/roles/:id
const getById = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return errorResponse(res, 'Role tidak ditemukan', 404);
    return successResponse(res, 'Data role berhasil diambil', role);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/roles
const create = async (req, res) => {
  try {
    const { nama_role } = req.body;
    const role = await Role.create({ nama_role });
    return successResponse(res, 'Role berhasil dibuat', role, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PUT /api/roles/:id
const update = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return errorResponse(res, 'Role tidak ditemukan', 404);
    await role.update(req.body);
    return successResponse(res, 'Role berhasil diperbarui', role);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// DELETE /api/roles/:id
const remove = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return errorResponse(res, 'Role tidak ditemukan', 404);
    await role.destroy();
    return successResponse(res, 'Role berhasil dihapus');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
