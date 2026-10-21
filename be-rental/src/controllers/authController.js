const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { nama, email, password, no_hp, alamat, role_id } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, 'Email sudah terdaftar', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Default role = 2 (customer) jika tidak disediakan
    const assignedRole = role_id || 2;

    const user = await User.create({
      nama,
      email,
      password: hashedPassword,
      no_hp,
      alamat,
      role_id: assignedRole,
      status: 'aktif',
    });

    const userData = { id: user.id, nama: user.nama, email: user.email };
    return successResponse(res, 'Registrasi berhasil', userData, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) {
      return errorResponse(res, 'Email atau password salah', 401);
    }

    if (user.status === 'nonaktif') {
      return errorResponse(res, 'Akun Anda dinonaktifkan, hubungi admin', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Email atau password salah', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role?.nama_role },
      process.env.JWT_SECRET || 'rental_secret_key_2024',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const userData = {
      id: user.id,
      nama: user.nama,
      email: user.email,
      no_hp: user.no_hp,
      alamat: user.alamat,
      foto: user.foto,
      status: user.status,
      role: user.role?.nama_role,
    };

    return successResponse(res, 'Login berhasil', { token, user: userData });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/auth/profile
const profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }],
    });

    return successResponse(res, 'Data profil berhasil diambil', user);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { nama, no_hp, alamat } = req.body;
    const foto = req.file ? req.file.path.replace(/\\/g, '/') : undefined;

    const updateData = { nama, no_hp, alamat };
    if (foto) updateData.foto = foto;

    await User.update(updateData, { where: { id: req.user.id } });

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }],
    });

    return successResponse(res, 'Profil berhasil diperbarui', updatedUser);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { password_lama, password_baru } = req.body;

    const user = await User.findByPk(req.user.id);
    const isValid = await bcrypt.compare(password_lama, user.password);

    if (!isValid) {
      return errorResponse(res, 'Password lama tidak sesuai', 400);
    }

    const hashed = await bcrypt.hash(password_baru, 12);
    await user.update({ password: hashed });

    return successResponse(res, 'Password berhasil diubah');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { register, login, profile, updateProfile, changePassword };
