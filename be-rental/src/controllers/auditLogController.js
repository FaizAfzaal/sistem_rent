const { AuditLog, User } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, size = 15 } = req.query;
    const { limit, offset } = getPagination(page, size);

    const { count, rows } = await AuditLog.findAndCountAll({
      limit,
      offset,
      include: [{ model: User, as: 'user', attributes: ['id', 'nama', 'email'] }],
      order: [['created_at', 'DESC']],
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data audit log berhasil diambil', rows, pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getAuditLogs };
