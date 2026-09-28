const { Op } = require('sequelize');
const { Alat, KategoriAlat, BookingDetail, Booking, Maintenance, AlatKelengkapan } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { generateKodeAlat } = require('../helpers/generateKode');
const { sanitizePriceData } = require('../helpers/sanitizePriceHelper');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Helper untuk menghitung inventory live stok per alat:
// Stok Tersedia = Total Stok - Sedang Rental Aktif - Unit Maintenance
const computeInventoryForAlat = async (alat) => {
  const alatId = alat.id;
  const stokTotal = Number(alat.stok || 0);

  // Status booking yang aktif menyerap stok fisik (termasuk booking baru & rental berjalan)
  const activeRentedStatuses = [
    'BARANG_SEDANG_DISEWA',
    'RENTED',
    'disewa',
    'SEDANG_DISEWA',
    'BARANG_KELUAR',
    'PEMERIKSAAN_BARANG',
    'TERLAMBAT_KEMBALI',
    'SIAP_DIKEMBALIKAN',
    'WAITING_RETURN',
    'WAITING_PICKUP',
    'MENUNGGU_BARANG_KELUAR',
    'pending',
    'dikonfirmasi',
    'BOOKING_DIBUAT',
    'MENUNGGU_KETERSEDIAAN'
  ];

  const rentedDetails = await BookingDetail.findAll({
    where: { alat_id: alatId },
    include: [{
      model: Booking,
      as: 'booking',
      where: { status: { [Op.in]: activeRentedStatuses } },
      required: true,
    }]
  });

  const sedangRental = rentedDetails.reduce((sum, d) => sum + (Number(d.qty) || 1), 0);

  const activeMaintenance = await Maintenance.count({
    where: { alat_id: alatId, status: 'Perbaikan' }
  }).catch(() => 0);

  let unitMaintenance = activeMaintenance;
  if (unitMaintenance === 0 && (alat.kondisi === 'rusak_ringan' || alat.kondisi === 'rusak_berat' || alat.status === 'MAINTENANCE')) {
    unitMaintenance = 1;
  }

  const stokTersedia = Math.max(0, stokTotal - sedangRental - unitMaintenance);

  let computedStatus = 'tersedia';
  if (stokTersedia > 0) {
    computedStatus = 'tersedia';
  } else if (sedangRental > 0) {
    computedStatus = 'disewa';
  } else if (unitMaintenance > 0) {
    computedStatus = 'MAINTENANCE';
  } else {
    computedStatus = 'tidak_tersedia';
  }

  const plain = alat.toJSON();
  return {
    ...plain,
    stok_total: stokTotal,
    sedang_rental: sedangRental,
    unit_maintenance: unitMaintenance,
    stok_tersedia: stokTersedia,
    status: computedStatus,
  };
};

// GET /api/alat
const getAll = async (req, res) => {
  try {
    const { page = 1, size = 10, search, kategori_id, status, kondisi } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (kategori_id) where.kategori_id = kategori_id;
    if (status) where.status = status;
    if (kondisi) where.kondisi = kondisi;
    if (search) {
      where[Op.or] = [
        { nama_alat: { [Op.like]: `%${search}%` } },
        { kode_alat: { [Op.like]: `%${search}%` } },
        { merek: { [Op.like]: `%${search}%` } },
      ];
    }

    // Auto-sync data yang tidak konsisten (status TERSEDIA tetapi kondisi rusak_ringan / rusak_berat)
    await Alat.update(
      { kondisi: 'baik' },
      { where: { status: ['tersedia', 'TERSEDIA', 'TERSEDIA_KEMBALI'], kondisi: ['rusak_ringan', 'rusak_berat'] } }
    ).catch(() => {});

    const { count, rows } = await Alat.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: KategoriAlat, as: 'kategori' },
        { model: AlatKelengkapan, as: 'kelengkapan_list' },
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    const enrichedRows = await Promise.all(rows.map(row => computeInventoryForAlat(row)));

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Data alat berhasil diambil', sanitizePriceData(enrichedRows, req.user), pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/alat/:id
const getById = async (req, res) => {
  try {
    const alat = await Alat.findByPk(req.params.id, {
      include: [
        { model: KategoriAlat, as: 'kategori' },
        { model: AlatKelengkapan, as: 'kelengkapan_list' },
      ],
    });
    if (!alat) return errorResponse(res, 'Alat tidak ditemukan', 404);
    const enriched = await computeInventoryForAlat(alat);
    return successResponse(res, 'Data alat berhasil diambil', sanitizePriceData(enriched, req.user));
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/alat
const create = async (req, res) => {
  try {
    const {
      kategori_id,
      kode_alat,
      nama_alat,
      merek,
      deskripsi,
      harga_sewa,
      stok,
      kondisi,
      status,
      kelengkapan_list,
    } = req.body;

    const gambar = req.file ? req.file.path.replace(/\\/g, '/') : null;

    // Auto-generate kode jika tidak disediakan
    const finalKode = kode_alat || generateKodeAlat();

    const existingKode = await Alat.findOne({ where: { kode_alat: finalKode } });
    if (existingKode) return errorResponse(res, 'Kode alat sudah digunakan', 409);

    const alat = await Alat.create({
      kategori_id,
      kode_alat: finalKode,
      nama_alat,
      merek,
      deskripsi,
      harga_sewa,
      stok: stok || 0,
      kondisi: kondisi || 'baik',
      gambar,
      status: status || 'tersedia',
    });

    // Save Master Kelengkapan
    let kelengkapanArr = [];
    if (kelengkapan_list) {
      if (typeof kelengkapan_list === 'string') {
        try { kelengkapanArr = JSON.parse(kelengkapan_list); } catch (e) { kelengkapanArr = []; }
      } else if (Array.isArray(kelengkapan_list)) {
        kelengkapanArr = kelengkapan_list;
      }
    }

    if (kelengkapanArr && kelengkapanArr.length > 0) {
      const itemsToCreate = kelengkapanArr
        .map(item => typeof item === 'string' ? item.trim() : item?.nama_kelengkapan?.trim())
        .filter(Boolean);
      for (const name of itemsToCreate) {
        await AlatKelengkapan.create({
          alat_id: alat.id,
          nama_kelengkapan: name,
        });
      }
    }

    const alatData = await Alat.findByPk(alat.id, {
      include: [
        { model: KategoriAlat, as: 'kategori' },
        { model: AlatKelengkapan, as: 'kelengkapan_list' },
      ],
    });

    return successResponse(res, 'Alat berhasil ditambahkan', alatData, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// PUT /api/alat/:id
const update = async (req, res) => {
  try {
    const alat = await Alat.findByPk(req.params.id);
    if (!alat) return errorResponse(res, 'Alat tidak ditemukan', 404);

    const gambar = req.file ? req.file.path.replace(/\\/g, '/') : undefined;
    const updateData = { ...req.body };
    if (gambar) updateData.gambar = gambar;

    // Otomatis singkronkan status & kondisi
    if (updateData.status === 'tersedia' || updateData.status === 'TERSEDIA' || updateData.status === 'TERSEDIA_KEMBALI') {
      updateData.status = 'tersedia';
      updateData.kondisi = 'baik';
    } else if (updateData.kondisi === 'baik' && (updateData.status === 'tidak_tersedia' || updateData.status === 'MAINTENANCE')) {
      updateData.status = 'tersedia';
    } else if ((updateData.kondisi === 'rusak_ringan' || updateData.kondisi === 'rusak_berat') && updateData.status === 'tersedia') {
      updateData.status = 'tidak_tersedia';
    }

    await alat.update(updateData);

    // Update Master Kelengkapan jika disediakan
    if (req.body.kelengkapan_list !== undefined) {
      let kelengkapanArr = [];
      if (typeof req.body.kelengkapan_list === 'string') {
        try { kelengkapanArr = JSON.parse(req.body.kelengkapan_list); } catch (e) { kelengkapanArr = []; }
      } else if (Array.isArray(req.body.kelengkapan_list)) {
        kelengkapanArr = req.body.kelengkapan_list;
      }

      await AlatKelengkapan.destroy({ where: { alat_id: alat.id } });

      const itemsToCreate = kelengkapanArr
        .map(item => typeof item === 'string' ? item.trim() : item?.nama_kelengkapan?.trim())
        .filter(Boolean);
      for (const name of itemsToCreate) {
        await AlatKelengkapan.create({
          alat_id: alat.id,
          nama_kelengkapan: name,
        });
      }
    }

    const updatedAlat = await Alat.findByPk(alat.id, {
      include: [
        { model: KategoriAlat, as: 'kategori' },
        { model: AlatKelengkapan, as: 'kelengkapan_list' },
      ],
    });

    return successResponse(res, 'Alat berhasil diperbarui', updatedAlat);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// DELETE /api/alat/:id
const remove = async (req, res) => {
  const { sequelize, BookingDetail, Booking } = require('../models');
  const t = await sequelize.transaction();
  try {
    const alat = await Alat.findByPk(req.params.id, { transaction: t });
    if (!alat) {
      await t.rollback();
      return errorResponse(res, 'Alat tidak ditemukan', 404);
    }

    // Cari semua booking_detail yang merujuk ke alat ini
    const details = await BookingDetail.findAll({ where: { alat_id: alat.id }, transaction: t });
    const bookingIds = [...new Set(details.map(d => d.booking_id))];

    // Hapus detail booking terkait alat ini
    await BookingDetail.destroy({ where: { alat_id: alat.id }, transaction: t });

    // Hapus booking yang menjadi kosong tanpa detail item
    for (const bId of bookingIds) {
      const remainingCount = await BookingDetail.count({ where: { booking_id: bId }, transaction: t });
      if (remainingCount === 0) {
        await Booking.destroy({ where: { id: bId }, transaction: t });
      }
    }

    // Hapus data alat
    await alat.destroy({ transaction: t });
    await t.commit();

    return successResponse(res, 'Data alat beserta transaksi booking & logbook terkait berhasil dihapus');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

// PATCH /api/alat/:id/stok
const updateStok = async (req, res) => {
  try {
    const alat = await Alat.findByPk(req.params.id);
    if (!alat) return errorResponse(res, 'Alat tidak ditemukan', 404);

    const { stok } = req.body;
    if (stok === undefined || stok < 0) {
      return errorResponse(res, 'Stok tidak valid', 400);
    }

    await alat.update({ stok });
    return successResponse(res, 'Stok alat berhasil diperbarui', { id: alat.id, stok });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Exports for admin download
const exportExcel = async (req, res) => {
  try {
    const alat = await Alat.findAll({ include: [{ model: KategoriAlat, as: 'kategori' }], order: [['created_at', 'DESC']] });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Alat');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Kode', key: 'kode', width: 14 },
      { header: 'Nama', key: 'nama', width: 30 },
      { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Harga/Hari', key: 'harga', width: 16 },
      { header: 'Stok', key: 'stok', width: 8 },
      { header: 'Kondisi', key: 'kondisi', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    alat.forEach(a => sheet.addRow({ id: a.id, kode: a.kode_alat, nama: a.nama_alat, kategori: a.kategori?.nama_kategori || '-', harga: a.harga_sewa, stok: a.stok, kondisi: a.kondisi, status: a.status }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="alat_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { return errorResponse(res, error.message); }
};

const exportPDF = async (req, res) => {
  try {
    const alat = await Alat.findAll({ include: [{ model: KategoriAlat, as: 'kategori' }], order: [['created_at', 'DESC']] });
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="alat_${Date.now()}.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).text('Laporan Alat', { align: 'center' }); doc.moveDown(1);
    alat.forEach(a => { doc.fontSize(10).text(`${a.kode_alat} • ${a.nama_alat} • ${a.kategori?.nama_kategori || '-'} • Rp ${a.harga_sewa} • Stok: ${a.stok}`); doc.moveDown(0.4); });
    doc.end();
  } catch (error) { return errorResponse(res, error.message); }
};

const checkAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal_mulai, tanggal_selesai, qty = 1, exclude_booking_id } = req.query;

    if (!tanggal_mulai || !tanggal_selesai) {
      return errorResponse(res, 'Tanggal mulai dan tanggal selesai wajib diisi', 400);
    }

    const { checkAvailability: checkStock } = require('../helpers/stockHelper');
    const result = await checkStock(id, tanggal_mulai, tanggal_selesai, Number(qty), exclude_booking_id);

    if (!result.success) {
      return errorResponse(res, result.message, 404);
    }

    return successResponse(res, 'Pengecekan ketersediaan berhasil', result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getAll, getById, create, update, remove, updateStok, exportExcel, exportPDF, checkAvailability };
