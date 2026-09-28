const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// GET /api/users
const getAll = async (req, res) => {
  try {
    const { page = 1, size = 10, search, status, role_id } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (status) where.status = status;
    if (role_id) where.role_id = role_id;
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { nama: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { nik: { [Op.like]: `%${search}%` } },
      ];
    }

    const { Booking } = require('../models');
    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role' },
        { model: Booking, as: 'bookings', attributes: ['id', 'kode_booking', 'status', 'total_harga', 'tanggal_booking'] }
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data users berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/users/:id
const getById = async (req, res) => {
  try {
    const { Booking, BookingDetail, Alat } = require('../models');
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role' },
        {
          model: Booking,
          as: 'bookings',
          include: [{ model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }],
          order: [['created_at', 'DESC']]
        }
      ],
    });
    if (!user) return errorResponse(res, 'User tidak ditemukan', 404);
    return successResponse(res, 'Data user berhasil diambil', user);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/users
const create = async (req, res) => {
  try {
    const { nama, email, password, no_hp, alamat, role_id, status } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return errorResponse(res, 'Email sudah terdaftar', 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const foto = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const user = await User.create({
      nama,
      email,
      password: hashedPassword,
      no_hp,
      alamat,
      foto,
      role_id,
      status: status || 'aktif',
    });

    const userData = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }],
    });

    return successResponse(res, 'User berhasil dibuat', userData, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PUT /api/users/:id
const update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return errorResponse(res, 'User tidak ditemukan', 404);

    const { nama, no_hp, alamat, role_id, status } = req.body;
    const foto = req.file ? req.file.path.replace(/\\/g, '/') : undefined;

    const updateData = { nama, no_hp, alamat, role_id, status };
    if (foto) updateData.foto = foto;

    // Hapus key undefined
    Object.keys(updateData).forEach((k) => updateData[k] === undefined && delete updateData[k]);

    await user.update(updateData);

    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }],
    });

    return successResponse(res, 'User berhasil diperbarui', updatedUser);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// DELETE /api/users/:id
const remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return errorResponse(res, 'User tidak ditemukan', 404);
    await user.destroy();
    return successResponse(res, 'User berhasil dihapus');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PATCH /api/users/:id/status
const toggleStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return errorResponse(res, 'User tidak ditemukan', 404);

    const newStatus = user.status === 'aktif' ? 'nonaktif' : 'aktif';
    await user.update({ status: newStatus });

    return successResponse(res, `Status user diubah menjadi ${newStatus}`, { status: newStatus });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// (exports at end)

// Export Excel
const exportExcel = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nama', 'email', 'no_hp', 'alamat', 'status', 'created_at'],
      include: [{ model: Role, as: 'role', attributes: ['nama_role'] }],
      order: [['created_at', 'DESC']],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Nama', key: 'nama', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'No HP', key: 'no_hp', width: 18 },
      { header: 'Alamat', key: 'alamat', width: 40 },
      { header: 'Role', key: 'role', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Terdaftar', key: 'created_at', width: 20 },
    ];

    users.forEach(u => {
      sheet.addRow({
        id: u.id,
        nama: u.nama,
        email: u.email,
        no_hp: u.no_hp || '',
        alamat: u.alamat || '',
        role: u.role?.nama_role || '',
        status: u.status,
        created_at: u.created_at,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Export PDF
const exportPDF = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nama', 'email', 'no_hp', 'alamat', 'status', 'created_at'],
      include: [{ model: Role, as: 'role', attributes: ['nama_role'] }],
      order: [['created_at', 'DESC']],
    });

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).text('Laporan Users', { align: 'center' });
    doc.moveDown(1);

    users.forEach(u => {
      doc.fontSize(10).text(`${u.id} • ${u.nama} • ${u.email} • ${u.role?.nama_role || '-'} • ${u.status}`);
      if (u.no_hp || u.alamat) doc.fontSize(9).text(`No HP: ${u.no_hp || '-'} | Alamat: ${u.alamat || '-'}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// expose
module.exports = { getAll, getById, create, update, remove, toggleStatus, exportExcel, exportPDF };
