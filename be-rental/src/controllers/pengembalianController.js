const { Pengembalian, Booking, BookingDetail, Alat, User } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const sequelize = require('../config/database');

// GET /api/pengembalian
const getAll = async (req, res) => {
  try {
    const { page = 1, size = 10, kondisi_alat } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (kondisi_alat) where.kondisi_alat = kondisi_alat;

    const bookingWhere = {};
    const currentRole = req.user.role?.nama_role;
    if (currentRole !== 'admin') {
      bookingWhere.user_id = req.user.id;
    }

    const { count, rows } = await Pengembalian.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Booking,
          as: 'booking',
          where: bookingWhere,
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data pengembalian berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/pengembalian/:id
const getById = async (req, res) => {
  try {
    const pengembalian = await Pengembalian.findByPk(req.params.id, {
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [
            { model: User, as: 'user', attributes: { exclude: ['password'] } },
            {
              model: BookingDetail,
              as: 'details',
              include: [{ model: Alat, as: 'alat' }],
            },
          ],
        },
      ],
    });

    if (!pengembalian) return errorResponse(res, 'Data pengembalian tidak ditemukan', 404);

    const currentRole = req.user.role?.nama_role;
    if (currentRole !== 'admin' && pengembalian.booking?.user_id !== req.user.id) {
      return errorResponse(res, 'Akses tidak diizinkan', 403);
    }

    return successResponse(res, 'Data pengembalian berhasil diambil', pengembalian);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/pengembalian
const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { booking_id, tanggal_pengembalian, kondisi_alat, denda, catatan } = req.body;

    const booking = await Booking.findByPk(booking_id, {
      include: [{ model: BookingDetail, as: 'details' }],
      transaction: t,
    });

    if (!booking) {
      await t.rollback();
      return errorResponse(res, 'Booking tidak ditemukan', 404);
    }

    if (booking.status !== 'disewa' && booking.status !== 'dikonfirmasi') {
      await t.rollback();
      return errorResponse(res, 'Booking tidak dalam status yang dapat dikembalikan', 400);
    }

    const existing = await Pengembalian.findOne({ where: { booking_id }, transaction: t });
    if (existing) {
      await t.rollback();
      return errorResponse(res, 'Booking ini sudah memiliki data pengembalian', 409);
    }

    const pengembalian = await Pengembalian.create(
      {
        booking_id,
        tanggal_pengembalian,
        kondisi_alat,
        denda: denda || 0,
        catatan,
      },
      { transaction: t }
    );

    // Update status booking menjadi selesai
    await booking.update({ status: 'selesai' }, { transaction: t });

    // Kembalikan stok alat
    for (const detail of booking.details) {
      await Alat.increment('stok', { by: detail.qty, where: { id: detail.alat_id }, transaction: t });

      // Update kondisi alat jika perlu
      if (kondisi_alat && kondisi_alat !== 'baik') {
        await Alat.update({ kondisi: kondisi_alat }, { where: { id: detail.alat_id }, transaction: t });
      }
    }

    await t.commit();

    const result = await Pengembalian.findByPk(pengembalian.id, {
      include: [{ model: Booking, as: 'booking' }],
    });

    return successResponse(res, 'Pengembalian berhasil dicatat', result, 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

// PUT /api/pengembalian/:id
const update = async (req, res) => {
  try {
    const pengembalian = await Pengembalian.findByPk(req.params.id);
    if (!pengembalian) return errorResponse(res, 'Data pengembalian tidak ditemukan', 404);

    const { tanggal_pengembalian, kondisi_alat, denda, catatan } = req.body;
    await pengembalian.update({ tanggal_pengembalian, kondisi_alat, denda, catatan });

    return successResponse(res, 'Pengembalian berhasil diperbarui', pengembalian);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getAll, getById, create, update };
