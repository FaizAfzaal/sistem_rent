const { Booking, BookingDetail, ReturnTransaction, PickupTransaction, User, Customer, Alat, KategoriAlat, Maintenance, BookingChecklist } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { logAudit } = require('../helpers/auditLogger');
const { sanitizePriceData } = require('../helpers/sanitizePriceHelper');
const { ensureBookingChecklists } = require('../helpers/checklistHelper');
const { Op } = require('sequelize');

const { getCurrentDateWIB, addDaysStr } = require('../helpers/dateHelper');

// GET /api/return/rented (Barang Sedang Disewa & Metrics Summary)
const getRentedBookings = async (req, res) => {
  try {
    const { page = 1, size = 10, search, status_waktu } = req.query;
    const { limit, offset } = getPagination(page, size);

    const todayStr = getCurrentDateWIB();
    const activeDetailStatuses = ['BARANG_SEDANG_DISEWA', 'RENTED', 'disewa', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN'];

    const detailWhere = {
      status: { [Op.in]: activeDetailStatuses }
    };

    // Filter status_waktu per detail item
    if (status_waktu === 'aman') {
      const threeDaysLater = addDaysStr(todayStr, 3);
      detailWhere.tanggal_selesai = { [Op.gt]: threeDaysLater };
    } else if (status_waktu === 'segera_kembali') {
      const threeDaysLater = addDaysStr(todayStr, 3);
      detailWhere.tanggal_selesai = {
        [Op.gte]: todayStr,
        [Op.lte]: threeDaysLater
      };
    } else if (status_waktu === 'terlambat') {
      detailWhere.tanggal_selesai = { [Op.lt]: todayStr };
    }

    const bookingWhere = {};
    if (search) {
      bookingWhere[Op.or] = [
        { kode_booking: { [Op.like]: `%${search}%` } },
        { '$customer.full_name$': { [Op.like]: `%${search}%` } },
        { '$user.nama$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Booking.findAndCountAll({
      where: bookingWhere,
      limit,
      offset,
      subQuery: false,
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          where: detailWhere,
          required: true,
          include: [
            { model: Alat, as: 'alat' },
            { model: PickupTransaction, as: 'pickup', required: true },
            { model: ReturnTransaction, as: 'return' },
          ],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
      ],
      order: [['updated_at', 'DESC']],
      distinct: true,
    });

    // Summary Metrics per BookingDetail item (only count items that have PickupTransaction)
    const allActiveDetails = await BookingDetail.findAll({
      where: {
        status: { [Op.in]: activeDetailStatuses }
      },
      include: [
        { model: PickupTransaction, as: 'pickup', required: true }
      ]
    });

    let totalDisewa = allActiveDetails.length;
    let jatuhTempoHariIni = 0;
    let terlambatKembali = 0;
    let totalNilaiAktif = 0;

    allActiveDetails.forEach(d => {
      totalNilaiAktif += Number(d.subtotal || 0);
      if (d.tanggal_selesai === todayStr) jatuhTempoHariIni++;
      else if (d.tanggal_selesai < todayStr) terlambatKembali++;
    });

    const metrics = {
      totalDisewa,
      jatuhTempoHariIni,
      terlambatKembali,
      totalNilaiAktif,
    };

    const pagination = getPagingData(count, page, limit);

    const formattedRows = rows.map(b => {
      const bJson = b.toJSON();

      const activeItems = (bJson.details || []).map(d => {
        const pTx = d.pickup || d.pickups?.[0];
        const pDate = pTx?.pickup_date || d.tanggal_mulai;
        const pTime = pTx?.pickup_time || b.jam_mulai || '08:00';
        const adminName = pTx?.approved_by || 'Admin Warehouse';

        const durasiHari = d.tanggal_mulai && d.tanggal_selesai
          ? Math.max(1, Math.round((new Date(d.tanggal_selesai) - new Date(d.tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1)
          : 1;

        return {
          ...d,
          nama_alat: d.alat?.nama_alat || 'Alat Rental',
          kode_alat: d.alat?.kode_alat || 'ALT',
          status: d.status,
          tanggal_keluar: `${pDate} ${pTime} WIB`,
          tanggal_kembali: d.tanggal_selesai,
          estimasi_kembali: d.tanggal_selesai,
          durasi: `${durasiHari} Hari`,
          durasi_hari: durasiHari,
          admin_pengeluar: adminName,
        };
      });

      return {
        ...bJson,
        details: activeItems,
        items: activeItems,
      };
    });

    return res.json({
      success: true,
      message: 'Daftar barang sedang disewa berhasil diambil',
      data: sanitizePriceData(formattedRows, req.user),
      pagination,
      metrics: sanitizePriceData(metrics, req.user),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/return/ready (Barang Siap Dikembalikan - Rentals where today >= tanggal_selesai)
const getReturnReadyBookings = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const todayStr = getCurrentDateWIB();
    const activeDetailStatuses = ['BARANG_SEDANG_DISEWA', 'RENTED', 'disewa', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN'];

    const bookingWhere = {};
    if (search) {
      bookingWhere[Op.or] = [
        { kode_booking: { [Op.like]: `%${search}%` } },
        { '$customer.full_name$': { [Op.like]: `%${search}%` } },
        { '$user.nama$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Booking.findAndCountAll({
      where: bookingWhere,
      limit,
      offset,
      subQuery: false,
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          where: {
            status: { [Op.in]: activeDetailStatuses },
            tanggal_selesai: { [Op.lte]: todayStr }
          },
          required: true,
          include: [
            { model: Alat, as: 'alat' },
            { model: PickupTransaction, as: 'pickup', required: true },
            { model: ReturnTransaction, as: 'return' },
          ],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
      ],
      order: [['updated_at', 'DESC']],
      distinct: true,
    });

    const pagination = getPagingData(count, page, limit);

    const formattedRows = rows.map(b => {
      const bJson = b.toJSON();

      const activeItems = (bJson.details || []).map(d => {
        const pTx = d.pickup || d.pickups?.[0];
        const pDate = pTx?.pickup_date || d.tanggal_mulai;
        const pTime = pTx?.pickup_time || b.jam_mulai || '08:00';
        const adminName = pTx?.approved_by || 'Admin Warehouse';

        const durasiHari = d.tanggal_mulai && d.tanggal_selesai
          ? Math.max(1, Math.round((new Date(d.tanggal_selesai) - new Date(d.tanggal_mulai)) / (1000 * 60 * 60 * 24)) + 1)
          : 1;

        return {
          ...d,
          nama_alat: d.alat?.nama_alat || 'Alat Rental',
          kode_alat: d.alat?.kode_alat || 'ALT',
          status: d.status,
          tanggal_keluar: `${pDate} ${pTime} WIB`,
          tanggal_kembali: d.tanggal_selesai,
          estimasi_kembali: d.tanggal_selesai,
          durasi: `${durasiHari} Hari`,
          durasi_hari: durasiHari,
          admin_pengeluar: adminName,
        };
      });

      return {
        ...bJson,
        details: activeItems,
        items: activeItems,
      };
    });

    return paginatedResponse(res, 'Daftar barang siap dikembalikan berhasil diambil', sanitizePriceData(formattedRows, req.user), pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/return/history (Riwayat Pengembalian Barang)
const getReturnHistory = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const returnTxs = await ReturnTransaction.findAll({ attributes: ['booking_id'] });
    const returnedBookingIds = returnTxs.map(r => r.booking_id);

    const where = {
      [Op.or]: [
        { status: { [Op.in]: ['SELESAI_DISEWA', 'WAITING_FINANCE', 'BARANG_KEMBALI', 'PAID', 'COMPLETED', 'selesai', 'RETURNED', 'PARTIAL_RETURN'] } },
        { id: { [Op.in]: returnedBookingIds } }
      ]
    };

    if (search) {
      where[Op.and] = [
        {
          [Op.or]: [
            { kode_booking: { [Op.like]: `%${search}%` } },
            { '$customer.full_name$': { [Op.like]: `%${search}%` } },
            { '$user.nama$': { [Op.like]: `%${search}%` } },
          ]
        }
      ];
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          include: [
            { model: Alat, as: 'alat' },
            { model: PickupTransaction, as: 'pickup' },
            { model: ReturnTransaction, as: 'return' },
          ],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
      ],
      order: [['updated_at', 'DESC']],
      distinct: true,
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Riwayat pengembalian barang berhasil diambil', sanitizePriceData(rows, req.user), pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/return/detail/:id (Detail Rental Halaman Khusus)
const getReturnDetail = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureBookingChecklists(id).catch(() => {});

    const booking = await Booking.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          include: [
            { model: Alat, as: 'alat', include: [{ model: KategoriAlat, as: 'kategori' }] },
            { model: PickupTransaction, as: 'pickup' },
            { model: ReturnTransaction, as: 'return' },
            { model: BookingChecklist, as: 'checklists' },
          ],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
        { model: BookingChecklist, as: 'checklists' },
      ]
    });

    if (!booking) {
      return errorResponse(res, 'Data rental tidak ditemukan', 404);
    }

    const bJson = booking.toJSON();

    // Admin Penerimaan: Hanya menampilkan item alat yang sudah pernah keluar/picked up
    bJson.details = (bJson.details || []).filter(d =>
      ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'SELESAI_DISEWA', 'BARANG_DIKEMBALIKAN'].includes(d.status) ||
      d.pickup != null
    );

    return successResponse(res, 'Detail rental berhasil diambil', sanitizePriceData(bJson, req.user));
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/return/docs (Dokumentasi Foto Fisik Kondisi Barang)
const getReturnDocs = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {};
    if (search) {
      where.kode_booking = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          include: [
            { model: Alat, as: 'alat' },
            { model: PickupTransaction, as: 'pickup' },
            { model: ReturnTransaction, as: 'return' },
          ],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
      ],
      order: [['updated_at', 'DESC']],
      distinct: true,
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Dokumentasi foto fisik barang berhasil diambil', sanitizePriceData(rows, req.user), pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/return/process (Selesaikan Pengembalian Barang & Update SELESAI_DISEWA per Detail Alat)
const processReturn = async (req, res) => {
  try {
    const {
      booking_id,
      booking_detail_ids, // optional array of BookingDetail IDs to return
      return_name,
      return_phone,
      return_date,
      return_time = '17:00',
      return_signature,
      damage_status = 'sesuai_awal',
      damage_notes,
      return_notes,
      checklists: reqChecklists,
    } = req.body;

    // Process Checklist updates for return
    let checklistArray = [];
    if (reqChecklists) {
      if (typeof reqChecklists === 'string') {
        try { checklistArray = JSON.parse(reqChecklists); } catch (e) { checklistArray = []; }
      } else if (Array.isArray(reqChecklists)) {
        checklistArray = reqChecklists;
      }
    }

    const adminKembaliName = req.user?.nama || req.user?.email || 'Admin Pengembalian';
    const nowTime = new Date();

    if (checklistArray.length > 0) {
      for (const item of checklistArray) {
        const cId = item.id || item.checklist_id;
        if (cId) {
          await BookingChecklist.update(
            {
              status_kembali: item.status_kembali || item.status || 'ADA',
              keterangan_kembali: item.keterangan_kembali || item.keterangan || null,
              waktu_kembali: nowTime,
              admin_kembali_name: adminKembaliName,
            },
            { where: { id: cId } }
          );
        }
      }
    }

    let photoPaths = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      photoPaths = req.files.map(f => `uploads/returns/${f.filename}`);
    }

    if (!booking_id || !return_name || !return_phone || !return_date || !return_signature) {
      return errorResponse(res, 'Lengkapi data pengembalian terlebih dahulu (Nama pengembali, No HP, Tanggal, dan Tanda Tangan wajib diisi)', 400);
    }

    if (photoPaths.length === 0) {
      const existingTx = await ReturnTransaction.findOne({ where: { booking_id } });
      const existingPhotos = existingTx ? JSON.parse(existingTx.return_photos || '[]') : [];
      if (existingPhotos.length === 0) {
        return errorResponse(res, 'Lengkapi data pengembalian terlebih dahulu (Upload minimal 1 foto fisik pengembalian barang)', 400);
      }
      photoPaths = existingPhotos;
    }

    const booking = await Booking.findByPk(booking_id, {
      include: [{ model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }]
    });

    if (!booking) return errorResponse(res, 'Data booking tidak ditemukan', 404);

    // Identify target details currently active in rental (BARANG_SEDANG_DISEWA, RENTED, disewa, WAITING_RETURN, SIAP_DIKEMBALIKAN)
    let targetDetails = (booking.details || []).filter(d =>
      ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'PEMERIKSAAN_BARANG'].includes(d.status)
    );

    // Fallback for legacy bookings or active rental bookings where detail status was not explicitly updated
    if (targetDetails.length === 0 && ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa', 'SIAP_DIKEMBALIKAN', 'WAITING_RETURN', 'PARTIAL_PICKUP', 'PARTIAL_RETURN'].includes(booking.status)) {
      targetDetails = (booking.details || []).filter(d => d.status !== 'SELESAI_DISEWA');
    }

    if (Array.isArray(booking_detail_ids) && booking_detail_ids.length > 0) {
      const targetIdSet = new Set(booking_detail_ids.map(Number));
      targetDetails = targetDetails.filter(d => targetIdSet.has(Number(d.id)));
    }

    if (targetDetails.length === 0) {
      return errorResponse(res, 'Tidak ada detail alat aktif yang dapat dikembalikan pada booking ini (barang belum diambil atau sudah dikembalikan).', 400);
    }

    const isEarly = new Date(return_date) < new Date(booking.tanggal_selesai) || req.body.return_type === 'EARLY_RETURN';
    const returnType = isEarly ? 'EARLY_RETURN' : 'NORMAL';
    const earlyDate = isEarly ? return_date : null;
    const earlyTime = isEarly ? return_time : null;
    const earlyReason = isEarly ? (req.body.early_return_reason || req.body.return_notes || 'Pengembalian alat lebih cepat dari jadwal kontrak').trim() : null;
    const adminName = req.user?.nama || 'Admin Penerimaan';

    const createdReturns = [];
    const { getWIBDateTime } = require('../helpers/stockHelper');
    const wib = getWIBDateTime();
    const customerNama = booking.user?.nama || booking.customer?.nama || return_name.trim();

    for (const detail of targetDetails) {
      await BookingDetail.update({ status: 'SELESAI_DISEWA' }, { where: { id: detail.id } });

      let returnTx = await ReturnTransaction.findOne({ where: { booking_id, booking_detail_id: detail.id } });
      if (returnTx) {
        await returnTx.update({
          return_name: return_name.trim(),
          return_phone: return_phone.trim(),
          return_date,
          return_time,
          return_signature,
          return_photos: JSON.stringify(photoPaths),
          damage_status,
          damage_notes: damage_notes ? damage_notes.trim() : null,
          return_notes: return_notes ? return_notes.trim() : null,
          return_type: returnType,
          early_return_date: earlyDate,
          early_return_time: earlyTime,
          early_return_reason: earlyReason,
          approved_by: adminName,
        });
      } else {
        returnTx = await ReturnTransaction.create({
          booking_id,
          booking_detail_id: detail.id,
          return_name: return_name.trim(),
          return_phone: return_phone.trim(),
          return_date,
          return_time,
          return_signature,
          return_photos: JSON.stringify(photoPaths),
          damage_status,
          damage_notes: damage_notes ? damage_notes.trim() : null,
          return_notes: return_notes ? return_notes.trim() : null,
          return_type: returnType,
          early_return_date: earlyDate,
          early_return_time: earlyTime,
          early_return_reason: earlyReason,
          approved_by: adminName,
        });
      }
      createdReturns.push(returnTx);

      const toolName = detail.alat?.nama_alat || `Alat ID #${detail.alat_id}`;
      const qtyVal = Number(detail.qty || 1);

      if (damage_status === 'ada_kerusakan' || damage_status === 'rusak_ringan' || damage_status === 'rusak_berat') {
        const cond = damage_status === 'rusak_berat' ? 'rusak_berat' : 'rusak_ringan';
        await Alat.update({ status: 'MAINTENANCE', kondisi: cond }, { where: { id: detail.alat_id } });
        await Maintenance.create({
          alat_id: detail.alat_id,
          tanggal: return_date,
          kerusakan: damage_notes || `Kerusakan (${cond}) pasca pengembalian barang`,
          deskripsi: `Dicatat dari pengembalian Booking #${booking.kode_booking}. Catatan: ${return_notes || '-'}`,
          biaya: 0,
          status: 'Perbaikan',
        });

        await logAudit(
          req.user?.id,
          `[STOK] Barang masuk maintenance (${wib.date}): ${toolName} (1 unit) - Rusak saat pengembalian (Booking #${booking.kode_booking})`,
          { status: 'SEDANG_DISEWA' },
          { status: 'MAINTENANCE', kondisi: cond }
        );
      } else {
        await Alat.update({ status: 'TERSEDIA', kondisi: 'baik' }, { where: { id: detail.alat_id } });

        await logAudit(
          req.user?.id,
          `[STOK] Barang kembali (${wib.date}): ${toolName} (+${qtyVal} unit) - Customer: ${customerNama} (Booking #${booking.kode_booking})`,
          { status: 'SEDANG_DISEWA' },
          { status: 'TERSEDIA', qty_kembali: qtyVal, tanggal_kembali: wib.fullStr }
        );
      }
    }

    // Recalculate top-level booking status (supports PARTIAL_RETURN, SELESAI_DISEWA, etc)
    const { recalculateBookingStatus } = require('../helpers/stockHelper');
    const newBookingStatus = await recalculateBookingStatus(booking_id);

    await booking.update({
      actual_return_date: return_date,
    });

    // Auto generate Return PDF Document
    try {
      const { RentalDocument } = require('../models');
      const { generateReturnPDF } = require('../helpers/pdfGenerator');
      const path = require('path');

      const docNum = `Pengembalian_${booking.kode_booking}`;
      const filename = `${docNum}.pdf`;
      const relativePdfPath = `/uploads/documents/${filename}`;
      const absolutePdfPath = path.join(__dirname, '..', '..', 'uploads', 'documents', filename);

      const firstDetail = (booking.details && booking.details[0]) || {};
      const alatObj = firstDetail.alat || {};
      const custName = booking.customer?.full_name || booking.user?.nama || return_name.trim();
      const custPhone = booking.customer?.phone || booking.user?.no_hp || return_phone.trim();
      const adminName = req.user?.nama || 'Admin Penerima';

      // Calculate difference if not provided
      const contractDate = new Date(booking.tanggal_selesai);
      const today = new Date(return_date || Date.now());
      const diffTime = today - contractDate;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let calculatedDiff = 'Sesuai Jadwal Kontrak';
      if (diffDays > 0) {
        calculatedDiff = `Terlambat ${diffDays} Hari`;
      } else if (diffDays < 0) {
        calculatedDiff = `${Math.abs(diffDays)} Hari Lebih Cepat`;
      }

      await generateReturnPDF({
        document_number: docNum,
        kode_booking: booking.kode_booking,
        customer_name: custName,
        customer_phone: custPhone,
        nama_alat: alatObj.nama_alat || 'Alat Berat',
        kode_alat: alatObj.kode_alat || '-',
        tanggal_keluar: booking.tanggal_mulai,
        jadwal_kembali_kontrak: booking.tanggal_selesai,
        waktu_kembali_aktual: `${return_date} (${return_time || '17:00'} WIB)`,
        selisih_hari: calculatedDiff,
        checklists: { alat_sesuai: damage_status === 'sesuai_awal' },
        catatan_admin: return_notes || damage_notes || '',
        photos: photoPaths,
        customer_signature: return_signature,
        admin_signature: return_signature,
        admin_name: adminName,
        created_date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      }, absolutePdfPath);

      let docRecord = await RentalDocument.findOne({
        where: { rental_id: booking_id, document_type: 'RETURN' }
      });

      if (docRecord) {
        await docRecord.update({
          document_number: docNum,
          customer_signature: return_signature,
          admin_signature: return_signature,
          pdf_path: relativePdfPath,
          created_by: req.user?.id || null,
        });
      } else {
        await RentalDocument.create({
          rental_id: booking_id,
          document_type: 'RETURN',
          document_number: docNum,
          customer_signature: return_signature,
          admin_signature: return_signature,
          pdf_path: relativePdfPath,
          created_by: req.user?.id || null,
        });
      }
    } catch (docErr) {
      console.error('Auto generate Return PDF error:', docErr);
    }

    const { reevaluateQueueBookings } = require('../helpers/stockHelper');
    reevaluateQueueBookings().catch(() => {});

    return successResponse(res, `Pengembalian barang (${targetDetails.length} alat) berhasil diproses.`, {
      booking,
      returns: createdReturns,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getRentedBookings,
  getReturnReadyBookings,
  getReturnHistory,
  getReturnDetail,
  getReturnDocs,
  processReturn,
};
