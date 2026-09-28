const { Op } = require('sequelize');
const { Customer, Booking, User } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { generateCustomerCode } = require('../helpers/generateKode');

// GET /api/customers
const getAll = async (req, res) => {
  try {
    const { page = 1, size = 10, search, status, include_deleted } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { customer_code: { [Op.like]: `%${search}%` } },
        { full_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { company_name: { [Op.like]: `%${search}%` } },
        { identity_number: { [Op.like]: `%${search}%` } },
      ];
    }

    const isParanoid = include_deleted !== 'true';

    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      paranoid: isParanoid,
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data customer berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/customers/:id
const getById = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      paranoid: false,
      include: [
        {
          model: Booking,
          as: 'bookings',
        },
      ],
    });

    if (!customer) return errorResponse(res, 'Customer tidak ditemukan', 404);

    return successResponse(res, 'Data customer berhasil diambil', customer);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/customers
const create = async (req, res) => {
  try {
    const {
      full_name, phone, email, company_name,
      identity_type = 'KTP', identity_number,
      address, city, province, postal_code,
      status = 'active', notes
    } = req.body;

    if (!full_name || !phone || !identity_number || !address) {
      return errorResponse(res, 'Nama lengkap, Nomor HP, Nomor identitas, dan Alamat wajib diisi', 400);
    }

    // Check email uniqueness if provided
    if (email && email.trim()) {
      const existingEmail = await Customer.findOne({ where: { email: email.trim() }, paranoid: false });
      if (existingEmail) {
        return errorResponse(res, 'Alamat email sudah terdaftar', 400);
      }
    }

    // Auto generate customer code CUST0001, CUST0002...
    const customer_code = await generateCustomerCode(Customer);

    const identity_photo = req.file ? `uploads/customers/${req.file.filename}` : null;

    const customer = await Customer.create({
      customer_code,
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      company_name: company_name ? company_name.trim() : null,
      identity_type,
      identity_number: identity_number.trim(),
      identity_photo,
      address: address.trim(),
      city: city ? city.trim() : null,
      province: province ? province.trim() : null,
      postal_code: postal_code ? postal_code.trim() : null,
      status,
      notes: notes ? notes.trim() : null,
    });

    return successResponse(res, 'Customer berhasil ditambahkan', customer, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PUT /api/customers/:id
const update = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, { paranoid: false });
    if (!customer) return errorResponse(res, 'Customer tidak ditemukan', 404);

    const {
      full_name, phone, email, company_name,
      identity_type, identity_number,
      address, city, province, postal_code,
      status, notes
    } = req.body;

    // Check email uniqueness if changed
    if (email && email.trim() && email.trim() !== customer.email) {
      const existingEmail = await Customer.findOne({ where: { email: email.trim() }, paranoid: false });
      if (existingEmail) {
        return errorResponse(res, 'Alamat email sudah terdaftar pada customer lain', 400);
      }
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email ? email.trim() : null;
    if (company_name !== undefined) updates.company_name = company_name ? company_name.trim() : null;
    if (identity_type !== undefined) updates.identity_type = identity_type;
    if (identity_number !== undefined) updates.identity_number = identity_number.trim();
    if (address !== undefined) updates.address = address.trim();
    if (city !== undefined) updates.city = city ? city.trim() : null;
    if (province !== undefined) updates.province = province ? province.trim() : null;
    if (postal_code !== undefined) updates.postal_code = postal_code ? postal_code.trim() : null;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes ? notes.trim() : null;

    if (req.file) {
      updates.identity_photo = `uploads/customers/${req.file.filename}`;
    }

    await customer.update(updates);

    // Sync ke User model jika ada user account terkait
    if (customer.email) {
      const userSync = {};
      if (updates.full_name) userSync.nama = updates.full_name;
      if (updates.phone) userSync.no_hp = updates.phone;
      if (Object.keys(userSync).length > 0) {
        await User.update(userSync, { where: { email: customer.email } });
      }
    }

    return successResponse(res, 'Data customer berhasil diperbarui', customer);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// DELETE /api/customers/:id (Soft Delete)
const deleteSoft = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return errorResponse(res, 'Customer tidak ditemukan', 404);

    await customer.destroy(); // Soft delete because paranoid: true
    return successResponse(res, 'Customer berhasil dihapus (soft delete)');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PATCH /api/customers/:id/restore (Restore Soft Delete)
const restore = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, { paranoid: false });
    if (!customer) return errorResponse(res, 'Customer tidak ditemukan', 404);

    if (!customer.deleted_at) {
      return errorResponse(res, 'Customer ini tidak dalam status terhapus', 400);
    }

    await customer.restore();
    return successResponse(res, 'Customer berhasil dipulihkan', customer);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// DELETE /api/customers/:id/force (Permanent Delete)
const forceDelete = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, { paranoid: false });
    if (!customer) return errorResponse(res, 'Customer tidak ditemukan', 404);

    await customer.destroy({ force: true });
    return successResponse(res, 'Customer berhasil dihapus permanen');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteSoft,
  restore,
  forceDelete,
};
