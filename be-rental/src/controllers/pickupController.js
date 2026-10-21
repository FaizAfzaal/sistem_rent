const { Booking, BookingDetail, PickupTransaction, ReturnTransaction, User, Customer, Alat, KategoriAlat, BookingChecklist } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPagination, getPagingData } = require('../helpers/pagination');
const { logAudit } = require('../helpers/auditLogger');
const { sanitizePriceData } = require('../helpers/sanitizePriceHelper');
const { ensureBookingChecklists } = require('../helpers/checklistHelper');
const { Op } = require('sequelize');

// GET /api/pickup/ready (Daftar Booking & BookingDetail Siap Keluar per Tanggal WIB)
const getReadyPickups = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const { getCurrentDateWIB } = require('../helpers/dateHelper');
    const { autoCancelUncollectedBookings } = require('../helpers/autoCancelHelper');
    await autoCancelUncollectedBookings();
    const todayStr = getCurrentDateWIB();

    // Query BookingDetail yang tanggal_mulai <= hari ini WIB dan belum pernah dikeluarkannya
    const detailWhere = {
      status: { [Op.in]: ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi', 'MENUNGGU_KETERSEDIAAN'] }
    };

    const readyDetails = await BookingDetail.findAll({
      where: detailWhere,
      attributes: ['booking_id'],
    });

    const readyBookingIds = [...new Set(readyDetails.map(d => Number(d.booking_id)))];

    const bookingWhere = {
      id: { [Op.in]: readyBookingIds.length > 0 ? readyBookingIds : [0] }
    };

    if (search) {
      bookingWhere[Op.or] = [
        { kode_booking: { [Op.like]: `%${search}%` } },
        { '$customer.full_name$': { [Op.like]: `%${search}%` } },
        { '$user.nama$': { [Op.like]: `%${search}%` } },
      ];
    }

    // Auto-ensure checklists for ready bookings
    for (const bId of readyBookingIds) {
      await ensureBookingChecklists(bId).catch(() => {});
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
          include: [
            { model: Alat, as: 'alat', include: [{ model: KategoriAlat, as: 'kategori' }] },
            { model: PickupTransaction, as: 'pickup' },
            { model: ReturnTransaction, as: 'return' },
            { model: BookingChecklist, as: 'checklists' },
          ],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: BookingChecklist, as: 'checklists' },
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    // Filter out details in each booking row that are NOT ready for pickup yet (tanggal_mulai > todayStr or status != WAITING_PICKUP)
    const filteredRows = rows.map(b => {
      const bJson = b.toJSON();
      const readyItems = (bJson.details || []).filter(d =>
        ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi', 'MENUNGGU_KETERSEDIAAN'].includes(d.status)
      );
      return {
        ...bJson,
        ready_details: readyItems,
      };
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Daftar booking siap keluar berhasil diambil', sanitizePriceData(filteredRows, req.user), pagination);
  } catch (error) {
    console.error('ERROR in getReadyPickups:', error);
    return errorResponse(res, error.message);
  }
};

// GET /api/pickup/rented (Daftar Barang Sedang Disewa)
const getRentedPickups = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const activeDetails = await BookingDetail.findAll({
      where: { status: { [Op.in]: ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa'] } },
      attributes: ['booking_id']
    });

    const activeBookingIds = [...new Set(activeDetails.map(d => d.booking_id))];

    const where = {
      [Op.or]: [
        { status: { [Op.in]: ['BARANG_SEDANG_DISEWA', 'SEDANG_DISEWA', 'RENTED', 'disewa'] } },
        { id: { [Op.in]: activeBookingIds.length > 0 ? activeBookingIds : [0] } }
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
      subQuery: false,
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password'] } },
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          include: [{ model: Alat, as: 'alat' }],
        },
        { model: PickupTransaction, as: 'pickup' },
        { model: ReturnTransaction, as: 'return' },
      ],
      order: [['updated_at', 'DESC']],
      distinct: true,
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Daftar barang sedang disewa berhasil diambil', sanitizePriceData(rows, req.user), pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/pickup/history (Riwayat Pengeluaran Barang)
const getPickupHistory = async (req, res) => {
  try {
    const { page = 1, size = 10, search } = req.query;
    const { limit, offset } = getPagination(page, size);

    const where = {
      status: { [Op.notIn]: ['WAITING_PICKUP', 'pending', 'dikonfirmasi'] }
    };

    if (search) {
      where[Op.or] = [
        { kode_booking: { [Op.like]: `%${search}%` } },
        { '$customer.full_name$': { [Op.like]: `%${search}%` } },
        { '$user.nama$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      limit,
      offset,
      subQuery: false,
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

    const filteredRows = rows.map(b => {
      const bJson = b.toJSON();
      const pickedUpItems = (bJson.details || []).filter(d =>
        !['WAITING_PICKUP', 'pending', 'dikonfirmasi'].includes(d.status)
      );
      return {
        ...bJson,
        details: pickedUpItems,
      };
    });

    const pagination = getPagingData(count, page, limit);
    return paginatedResponse(res, 'Riwayat pengeluaran barang berhasil diambil', sanitizePriceData(filteredRows, req.user), pagination);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// GET /api/pickup/available-equipment (Daftar Alat Tersedia Untuk Ditambahkan)
const getAvailableEquipment = async (req, res) => {
  try {
    const { search, tanggal_mulai, tanggal_selesai, booking_id } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { nama_alat: { [Op.like]: `%${search}%` } },
        { kode_alat: { [Op.like]: `%${search}%` } },
      ];
    }

    const equipmentList = await Alat.findAll({
      where,
      include: [{ model: KategoriAlat, as: 'kategori' }],
      order: [['nama_alat', 'ASC']],
    });

    const { checkAvailability, getCurrentDateWIB } = require('../helpers/stockHelper');
    const todayStr = getCurrentDateWIB();
    const targetStart = tanggal_mulai || todayStr;
    const targetEnd = tanggal_selesai || targetStart;

    const formattedList = await Promise.all(equipmentList.map(async (item) => {
      const stockRes = await checkAvailability(item.id, targetStart, targetEnd, 1, booking_id || null);
      const isAvailable = stockRes.is_available;

      return {
        ...item.toJSON(),
        harga_sewa: Number(item.harga_sewa || 0),
        stok_total: Number(item.stok || stockRes.stok_total || 0),
        stok_tersedia: Number(stockRes.sisa_stok ?? item.stok ?? 0),
        is_available: isAvailable,
        availability_reason: isAvailable ? 'Tersedia' : 'Stok habis / alat sedang digunakan customer lain',
      };
    }));

    return successResponse(res, 'Daftar alat tersedia berhasil diambil', sanitizePriceData(formattedList, req.user));
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/pickup/add-items (Tambah Alat Pada Booking Existing)
const addEquipmentToBooking = async (req, res) => {
  try {
    const { booking_id, items } = req.body;

    if (!booking_id || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 'Nomor booking dan minimal 1 alat tambahan wajib dipilih', 400);
    }

    const booking = await Booking.findByPk(booking_id, {
      include: [{ model: BookingDetail, as: 'details' }]
    });

    if (!booking) {
      return errorResponse(res, 'Data booking tidak ditemukan', 404);
    }

    const { checkAvailability, getWIBDateTime } = require('../helpers/stockHelper');
    const nowWIB = getWIBDateTime();

    for (const item of items) {
      const alat = await Alat.findByPk(item.alat_id);
      if (!alat) {
        return errorResponse(res, `Alat dengan ID ${item.alat_id} tidak ditemukan`, 404);
      }

      const itemStart = item.tanggal_mulai || booking.tanggal_mulai;
      const itemEnd = item.tanggal_selesai || booking.tanggal_selesai;
      const itemJamMulai = item.jam_mulai || '08:00';
      const itemJamSelesai = item.jam_selesai || '17:00';
      const reqQty = Number(item.qty || 1);

      if (itemStart < nowWIB.date) {
        return errorResponse(res, `Tanggal mulai rental tidak boleh tanggal yang sudah lewat (Minimal hari ini WIB: ${nowWIB.date}).`, 400);
      }
      if (itemEnd === itemStart && itemJamSelesai <= itemJamMulai) {
        return errorResponse(res, `Jam pengembalian tidak valid. Jam kembali harus setelah jam pengambilan.`, 400);
      }

      const stockRes = await checkAvailability(item.alat_id, itemStart, itemEnd, reqQty, booking.id);
      if (!stockRes.is_available) {
        return errorResponse(res, stockRes.detailed_message || `Alat '${alat.nama_alat}' stok tidak mencukupi atau sedang disewa customer lain pada periode ${itemStart} s/d ${itemEnd}.`, 400);
      }
    }

    // Process adding new BookingDetail records
    for (const item of items) {
      const alat = await Alat.findByPk(item.alat_id);
      const qtyVal = Number(item.qty || 1);
      const priceVal = Number((item.harga && Number(item.harga) > 0) ? item.harga : (alat.harga_sewa || 0));

      const itemStart = item.tanggal_mulai || booking.tanggal_mulai;
      const itemEnd = item.tanggal_selesai || booking.tanggal_selesai;
      const itemJamMulai = item.jam_mulai || '08:00';
      const itemJamSelesai = item.jam_selesai || '17:00';

      const startDate = new Date(itemStart);
      const endDate = new Date(itemEnd);
      const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const durationDays = Math.max(1, diffDays);

      const startMs = new Date(`${itemStart}T${itemJamMulai}:00`).getTime();
      const endMs = new Date(`${itemEnd}T${itemJamSelesai}:00`).getTime();
      const durasiJam = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60)));

      const itemSubtotal = qtyVal * priceVal * durationDays;

      await BookingDetail.create({
        booking_id: booking.id,
        alat_id: item.alat_id,
        qty: qtyVal,
        harga: priceVal,
        subtotal: itemSubtotal,
        tanggal_mulai: itemStart,
        tanggal_selesai: itemEnd,
        jam_mulai: itemJamMulai,
        jam_selesai: itemJamSelesai,
        status: 'WAITING_PICKUP',
        durasi_jam: durasiJam,
        kelengkapan: 'Unit utama & aksesoris standar (Tambahan Pengeluaran)',
      });
    }

    // Ensure checklists created for newly added items
    await ensureBookingChecklists(booking.id).catch(() => {});

    // Recalculate total booking price and top-level date range
    const updatedDetails = await BookingDetail.findAll({ where: { booking_id: booking.id } });
    const newTotalHarga = updatedDetails.reduce((sum, d) => sum + Number(d.subtotal || 0), 0);
    const sisaPembayaran = newTotalHarga - Number(booking.jumlah_dp || 0);

    const startDates = updatedDetails.map(d => d.tanggal_mulai).filter(Boolean);
    const endDates = updatedDetails.map(d => d.tanggal_selesai).filter(Boolean);
    startDates.sort();
    endDates.sort();

    const minMulai = startDates[0] || booking.tanggal_mulai;
    const maxSelesai = endDates[endDates.length - 1] || booking.tanggal_selesai;

    await booking.update({
      total_harga: newTotalHarga,
      sisa_pembayaran: sisaPembayaran > 0 ? sisaPembayaran : 0,
      tanggal_mulai: minMulai,
      tanggal_selesai: maxSelesai,
    });

    const finalBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: Customer, as: 'customer' },
        {
          model: BookingDetail,
          as: 'details',
          include: [{ model: Alat, as: 'alat', include: [{ model: KategoriAlat, as: 'kategori' }] }],
        },
      ]
    });

    return successResponse(res, 'Alat tambahan berhasil dimasukkan ke booking.', finalBooking);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/pickup/process (Form Pengeluaran Barang Berbasis BookingDetail)
const processPickup = async (req, res) => {
  try {
    const {
      booking_id,
      booking_detail_ids, // optional array of BookingDetail IDs to process
      pickup_name,
      pickup_phone,
      pickup_relation = 'Customer',
      pickup_date,
      pickup_time = '09:00',
      pickup_signature,
      condition_status = 'baik',
      pickup_notes,
      checklists: reqChecklists,
    } = req.body;

    const { getCurrentDateWIB, getWIBDateTime } = require('../helpers/dateHelper');
    const todayStr = getCurrentDateWIB();

    if (!booking_id || !pickup_name || !pickup_phone || !pickup_date || !pickup_signature) {
      return errorResponse(res, 'Nomor booking, Nama pengambil, No HP, Tanggal, dan Tanda Tangan wajib diisi', 400);
    }

    const booking = await Booking.findByPk(booking_id, {
      include: [{ model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] }]
    });

    if (!booking) return errorResponse(res, 'Data booking tidak ditemukan', 404);

    const effectivePickupDate = pickup_date || todayStr;

    // Identify target BookingDetail items eligible for pickup (tanggal_mulai <= effectivePickupDate and status WAITING_PICKUP)
    let targetDetails = (booking.details || []).filter(d =>
      ['WAITING_PICKUP', 'MENUNGGU_BARANG_KELUAR', 'pending', 'dikonfirmasi', 'MENUNGGU_KETERSEDIAAN'].includes(d.status)
    );

    if (Array.isArray(booking_detail_ids) && booking_detail_ids.length > 0) {
      const allowedIdSet = new Set(booking_detail_ids.map(Number));
      targetDetails = targetDetails.filter(d => allowedIdSet.has(Number(d.id)));
    }

    if (targetDetails.length === 0) {
      return errorResponse(res, 'Tidak ada detail alat yang memenuhi syarat untuk dikeluarkan hari ini (tanggal pickup belum masuk atau barang sudah keluar).', 400);
    }

    // Process Checklist updates for pickup
    let checklistArray = [];
    if (reqChecklists) {
      if (typeof reqChecklists === 'string') {
        try { checklistArray = JSON.parse(reqChecklists); } catch (e) { checklistArray = []; }
      } else if (Array.isArray(reqChecklists)) {
        checklistArray = reqChecklists;
      }
    }

    const adminKeluarName = req.user?.nama || req.user?.email || 'Admin Pengeluaran';
    const nowTime = new Date();

    if (checklistArray.length > 0) {
      for (const item of checklistArray) {
        const cId = item.id || item.checklist_id;
        if (cId) {
          await BookingChecklist.update(
            {
              status_keluar: item.status_keluar || item.status || 'ADA',
              keterangan_keluar: item.keterangan_keluar || item.keterangan || null,
              waktu_keluar: nowTime,
              admin_keluar_name: adminKeluarName,
            },
            { where: { id: cId } }
          );
        }
      }
    }

    let photoPaths = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      photoPaths = req.files.map(f => `uploads/pickups/${f.filename}`);
    }

    // Process pickup per detail item
    const createdPickups = [];
    for (const detail of targetDetails) {
      await BookingDetail.update({ status: 'BARANG_SEDANG_DISEWA' }, { where: { id: detail.id } });

      let pickupTx = await PickupTransaction.findOne({ where: { booking_id, booking_detail_id: detail.id } });
      if (pickupTx) {
        await pickupTx.update({
          pickup_name: pickup_name.trim(),
          pickup_phone: pickup_phone.trim(),
          pickup_relation,
          pickup_date,
          pickup_time,
          pickup_signature,
          pickup_photos: JSON.stringify(photoPaths.length > 0 ? photoPaths : (JSON.parse(pickupTx.pickup_photos || '[]'))),
          condition_status,
          pickup_notes: pickup_notes ? pickup_notes.trim() : null,
        });
      } else {
        pickupTx = await PickupTransaction.create({
          booking_id,
          booking_detail_id: detail.id,
          pickup_name: pickup_name.trim(),
          pickup_phone: pickup_phone.trim(),
          pickup_relation,
          pickup_date,
          pickup_time,
          pickup_signature,
          pickup_photos: JSON.stringify(photoPaths),
          condition_status,
          pickup_notes: pickup_notes ? pickup_notes.trim() : null,
        });
      }
      createdPickups.push(pickupTx);

      const toolName = detail.alat?.nama_alat || `Alat ID #${detail.alat_id}`;
      const qtyVal = Number(detail.qty || 1);
      const customerNama = booking.customer?.full_name || booking.customer?.nama || pickup_name.trim();

      await logAudit(
        req.user?.id,
        `[STOK] Barang keluar rental (${todayStr}): ${toolName} (-${qtyVal} unit) - Customer: ${customerNama} (Booking #${booking.kode_booking})`,
        { status: 'WAITING_PICKUP' },
        { status: 'SEDANG_DISEWA', qty_keluar: qtyVal, tanggal_keluar: todayStr }
      );
    }

    // Recalculate top-level booking status (supports PARTIAL_PICKUP, BARANG_SEDANG_DISEWA, PARTIAL_RETURN, SELESAI_DISEWA)
    const { recalculateBookingStatus } = require('../helpers/stockHelper');
    const newBookingStatus = await recalculateBookingStatus(booking_id);

    await booking.update({
      pengambil_nama: pickup_name.trim(),
      pengambil_no_hp: pickup_phone.trim(),
      pengambil_hubungan: pickup_relation,
    });

    // Auto generate Outgoing PDF Document
    try {
      const { RentalDocument } = require('../models');
      const { generateOutgoingPDF } = require('../helpers/pdfGenerator');
      const path = require('path');

      const docNum = `Serah_Terima_Keluar_${booking.kode_booking}`;
      const filename = `${docNum}.pdf`;
      const relativePdfPath = `/uploads/documents/${filename}`;
      const absolutePdfPath = path.join(__dirname, '..', '..', 'uploads', 'documents', filename);

      const firstDetail = (booking.details && booking.details[0]) || {};
      const alatObj = firstDetail.alat || {};
      const custName = booking.customer?.full_name || booking.user?.nama || pickup_name.trim();
      const custPhone = booking.customer?.phone || booking.user?.no_hp || pickup_phone.trim();
      const custEmail = booking.customer?.email || booking.user?.email || '-';
      const custAddress = booking.customer?.address || booking.user?.alamat || '-';
      const adminName = req.user?.nama || 'Admin Pengeluaran';

      await generateOutgoingPDF({
        document_number: docNum,
        kode_booking: booking.kode_booking,
        customer_name: custName,
        customer_phone: custPhone,
        customer_email: custEmail,
        customer_address: custAddress,
        nama_alat: alatObj.nama_alat || 'Alat Berat',
        kode_alat: alatObj.kode_alat || '-',
        merk: alatObj.merk || '-',
        lama_sewa: Math.max(1, Math.ceil((new Date(booking.tanggal_selesai) - new Date(booking.tanggal_mulai)) / 86400000) + 1),
        tanggal_keluar: pickup_date,
        jam_keluar: pickup_time || '08:00',
        jadwal_pengembalian: booking.tanggal_selesai,
        jam_selesai: booking.jam_selesai || '17:00',
        condition: { kondisi_baik: condition_status === 'baik' },
        catatan: pickup_notes || '',
        customer_signature: pickup_signature,
        admin_signature: pickup_signature,
        admin_name: adminName,
        created_date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      }, absolutePdfPath);

      let docRecord = await RentalDocument.findOne({
        where: { rental_id: booking_id, document_type: 'OUTGOING' }
      });
      if (docRecord) {
        await docRecord.update({
          document_number: docNum,
          customer_signature: pickup_signature,
          admin_signature: pickup_signature,
          pdf_path: relativePdfPath,
          created_by: req.user?.id || null,
        });
      } else {
        await RentalDocument.create({
          rental_id: booking_id,
          document_type: 'OUTGOING',
          document_number: docNum,
          customer_signature: pickup_signature,
          admin_signature: pickup_signature,
          pdf_path: relativePdfPath,
          created_by: req.user?.id || null,
        });
      }
    } catch (docErr) {
      console.error('Auto generate Outgoing PDF error:', docErr);
    }

    return successResponse(res, `Barang (${targetDetails.length} alat) berhasil dikeluarkan. Status detail berubah menjadi Sedang Disewa.`, {
      booking,
      pickups: createdPickups,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// POST /api/pickup/cancel/:id (Batalkan Pengeluaran Barang)
const cancelPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { alasan_pembatalan } = req.body;

    if (!alasan_pembatalan || !alasan_pembatalan.trim()) {
      return errorResponse(res, 'Alasan pembatalan wajib diisi', 400);
    }

    const booking = await Booking.findByPk(id);
    if (!booking) return errorResponse(res, 'Data booking tidak ditemukan', 404);

    await booking.update({
      status: 'CANCELLED',
      alasan_pembatalan: alasan_pembatalan.trim(),
      status_pembayaran: 'dibatalkan',
    });
    await BookingDetail.update({ status: 'CANCELLED' }, { where: { booking_id: id } });

    return successResponse(res, 'Pengeluaran barang berhasil dibatalkan', booking);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getReadyPickups,
  getRentedPickups,
  getPickupHistory,
  getAvailableEquipment,
  addEquipmentToBooking,
  processPickup,
  cancelPickup,
};
