const path = require('path');
const fs = require('fs');
const { Booking, BookingDetail, Customer, User, Alat, RentalDocument, ReturnTransaction, PickupTransaction } = require('../models');
const { generateOutgoingPDF, generateReturnPDF } = require('../helpers/pdfGenerator');

/**
 * Save & Generate PDF Serah Terima Barang Keluar (OUTGOING)
 * POST /api/rental/document/outgoing/sign
 */
exports.saveOutgoingSign = async (req, res) => {
  try {
    const {
      rental_id,
      booking_id,
      customer_signature,
      admin_signature,
      condition_data,
      catatan_kondisi,
    } = req.body;

    const bId = rental_id || booking_id;

    if (!bId) {
      return res.status(400).json({ success: false, message: 'ID transaksi rental (rental_id / booking_id) wajib diisi!' });
    }

    if (!customer_signature || !admin_signature) {
      return res.status(400).json({ success: false, message: 'Tanda tangan penyewa dan tanda tangan admin wajib diisi!' });
    }

    const booking = await Booking.findByPk(bId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] },
        { model: PickupTransaction, as: 'pickup' },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Data transaksi rental tidak ditemukan!' });
    }

    const docNum = `Serah_Terima_Keluar_${booking.kode_booking}`;
    const filename = `${docNum}.pdf`;
    const relativePdfPath = `/uploads/documents/${filename}`;
    const absolutePdfPath = path.join(__dirname, '..', '..', 'uploads', 'documents', filename);

    const firstDetail = (booking.details && booking.details[0]) || {};
    const alatObj = firstDetail.alat || {};

    const custName = booking.customer?.full_name || booking.user?.nama || booking.pengambil_nama || 'Penyewa';
    const custPhone = booking.customer?.phone || booking.user?.no_hp || booking.pengambil_no_hp || '-';
    const custEmail = booking.customer?.email || booking.user?.email || '-';
    const custAddress = booking.customer?.address || booking.user?.alamat || '-';
    const adminName = req.user?.nama || 'Admin RentalHub';

    let outgoingPhotos = [];
    if (booking.pickup && booking.pickup.pickup_photos) {
      try {
        outgoingPhotos = JSON.parse(booking.pickup.pickup_photos);
      } catch (e) {
        outgoingPhotos = [booking.pickup.pickup_photos];
      }
    }

    // Generate Outgoing PDF
    await generateOutgoingPDF({
      document_number: docNum,
      kode_booking: booking.kode_booking,
      customer_name: custName,
      customer_phone: custPhone,
      customer_email: custEmail,
      customer_address: custAddress,
      nama_alat: alatObj.nama_alat || 'Alat',
      kode_alat: alatObj.kode_alat || '-',
      merk: alatObj.merk || '-',
      gambar_alat: alatObj.gambar || null,
      photos: outgoingPhotos,
      lama_sewa: Math.max(1, Math.ceil((new Date(booking.tanggal_selesai) - new Date(booking.tanggal_mulai)) / 86400000) + 1),
      tanggal_keluar: booking.tanggal_mulai,
      jam_keluar: firstDetail.jam_mulai || booking.jam_mulai || '08:00',
      jadwal_pengembalian: booking.tanggal_selesai,
      jam_selesai: firstDetail.jam_selesai || booking.jam_selesai || '17:00',
      condition: parsedCondition,
      catatan: catatan_kondisi || parsedCondition.catatan || '',
      customer_signature,
      admin_signature,
      admin_name: adminName,
      created_date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    }, absolutePdfPath);

    // Save/Update in DB
    let docRecord = await RentalDocument.findOne({
      where: { rental_id: bId, document_type: 'OUTGOING' },
    });

    if (docRecord) {
      await docRecord.update({
        document_number: docNum,
        customer_signature,
        admin_signature,
        pdf_path: relativePdfPath,
        condition_data: parsedCondition,
        created_by: req.user?.id || null,
      });
    } else {
      docRecord = await RentalDocument.create({
        rental_id: bId,
        document_type: 'OUTGOING',
        document_number: docNum,
        customer_signature,
        admin_signature,
        pdf_path: relativePdfPath,
        condition_data: parsedCondition,
        created_by: req.user?.id || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dokumen Serah Terima Barang Keluar berhasil dibuat & ditandatangani',
      data: docRecord,
    });
  } catch (error) {
    console.error('Error saveOutgoingSign:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses dokumen serah terima', error: error.message });
  }
};

/**
 * Generate/Re-generate Outgoing PDF
 * POST /api/rental/document/outgoing/pdf
 */
exports.generateOutgoingPDFRoute = async (req, res) => {
  return exports.saveOutgoingSign(req, res);
};

/**
 * Save & Generate PDF Pengembalian Barang (RETURN)
 * POST /api/rental/document/return/sign
 */
exports.saveReturnSign = async (req, res) => {
  try {
    const {
      rental_id,
      booking_id,
      customer_signature,
      admin_signature,
      checklists,
      catatan_admin,
      waktu_kembali_aktual,
      selisih_hari,
      photo_paths,
    } = req.body;

    const bId = rental_id || booking_id;

    if (!bId) {
      return res.status(400).json({ success: false, message: 'ID transaksi rental (rental_id / booking_id) wajib diisi!' });
    }

    if (!customer_signature || !admin_signature) {
      return res.status(400).json({ success: false, message: 'Kedua tanda tangan (Penyewa & Admin) wajib diisi!' });
    }

    const booking = await Booking.findByPk(bId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: User, as: 'user' },
        { model: BookingDetail, as: 'details', include: [{ model: Alat, as: 'alat' }] },
        { model: ReturnTransaction, as: 'return' },
      ],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Data transaksi rental tidak ditemukan!' });
    }

    const docNum = `Pengembalian_${booking.kode_booking}`;
    const filename = `${docNum}.pdf`;
    const relativePdfPath = `/uploads/documents/${filename}`;
    const absolutePdfPath = path.join(__dirname, '..', '..', 'uploads', 'documents', filename);

    const firstDetail = (booking.details && booking.details[0]) || {};
    const alatObj = firstDetail.alat || {};

    const custName = booking.customer?.full_name || booking.user?.nama || booking.pengambil_nama || 'Penyewa';
    const custPhone = booking.customer?.phone || booking.user?.no_hp || booking.pengambil_no_hp || '-';
    const adminName = req.user?.nama || 'Admin Penerima';

    const parsedChecklists = typeof checklists === 'string' ? JSON.parse(checklists) : (checklists || {});

    // Photos uploaded or attached
    let photosList = [];
    if (req.files && req.files.length > 0) {
      photosList = req.files.map(f => `/uploads/${f.filename}`);
    } else if (photo_paths) {
      photosList = typeof photo_paths === 'string' ? JSON.parse(photo_paths) : photo_paths;
    } else if (booking.return && booking.return.foto_kondisi) {
      try {
        photosList = JSON.parse(booking.return.foto_kondisi);
      } catch (e) {
        photosList = [booking.return.foto_kondisi];
      }
    }

    // Calculate difference if not provided
    let calculatedDiff = selisih_hari;
    if (!calculatedDiff) {
      const contractDate = new Date(booking.tanggal_selesai);
      const today = new Date();
      const diffTime = today - contractDate;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        calculatedDiff = 'Sesuai Jadwal Kontrak';
      } else if (diffDays > 0) {
        calculatedDiff = `Terlambat ${diffDays} Hari`;
      } else {
        calculatedDiff = `${Math.abs(diffDays)} Hari Lebih Cepat`;
      }
    }

    // Generate Return PDF
    await generateReturnPDF({
      document_number: docNum,
      kode_booking: booking.kode_booking,
      customer_name: custName,
      customer_phone: custPhone,
      nama_alat: alatObj.nama_alat || 'Alat',
      kode_alat: alatObj.kode_alat || '-',
      gambar_alat: alatObj.gambar || null,
      tanggal_keluar: booking.tanggal_mulai,
      jadwal_kembali_kontrak: booking.tanggal_selesai,
      waktu_kembali_aktual: waktu_kembali_aktual || new Date().toLocaleString('id-ID'),
      selisih_hari: calculatedDiff,
      checklists: parsedChecklists,
      catatan_admin: catatan_admin || (booking.return && booking.return.return_notes) || '',
      photos: photosList,
      customer_signature,
      admin_signature,
      admin_name: adminName,
      created_date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    }, absolutePdfPath);

    // Save/Update in DB
    let docRecord = await RentalDocument.findOne({
      where: { rental_id: bId, document_type: 'RETURN' },
    });

    const conditionPayload = {
      checklists: parsedChecklists,
      catatan_admin,
      waktu_kembali_aktual,
      selisih_hari: calculatedDiff,
      photos: photosList,
    };

    if (docRecord) {
      await docRecord.update({
        document_number: docNum,
        customer_signature,
        admin_signature,
        pdf_path: relativePdfPath,
        condition_data: conditionPayload,
        created_by: req.user?.id || null,
      });
    } else {
      docRecord = await RentalDocument.create({
        rental_id: bId,
        document_type: 'RETURN',
        document_number: docNum,
        customer_signature,
        admin_signature,
        pdf_path: relativePdfPath,
        condition_data: conditionPayload,
        created_by: req.user?.id || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dokumen Pengembalian Barang berhasil dibuat & ditandatangani',
      data: docRecord,
    });
  } catch (error) {
    console.error('Error saveReturnSign:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses dokumen pengembalian', error: error.message });
  }
};

/**
 * Generate/Re-generate Return PDF
 * POST /api/rental/document/return/pdf
 */
exports.generateReturnPDFRoute = async (req, res) => {
  return exports.saveReturnSign(req, res);
};

/**
 * Download PDF File
 * GET /api/rental/document/:id/download
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    let docRecord = await RentalDocument.findByPk(id);
    if (!docRecord) {
      // Try searching by document_number or rental_id
      docRecord = await RentalDocument.findOne({
        where: { document_number: id },
      });
    }

    if (!docRecord || !docRecord.pdf_path) {
      return res.status(404).json({ success: false, message: 'Dokumen PDF tidak ditemukan!' });
    }

    const absolutePath = path.join(__dirname, '..', '..', docRecord.pdf_path);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'File PDF fisik tidak ditemukan pada server' });
    }

    const filename = path.basename(absolutePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Error downloadDocument:', error);
    return res.status(500).json({ success: false, message: 'Gagal mendownload PDF', error: error.message });
  }
};

/**
 * Get Documents By Booking ID
 * GET /api/rental/document/booking/:bookingId
 */
exports.getDocumentsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const docs = await RentalDocument.findAll({
      where: { rental_id: bookingId },
      order: [['id', 'ASC']],
    });

    const outgoing = docs.find(d => d.document_type === 'OUTGOING') || null;
    const returnDoc = docs.find(d => d.document_type === 'RETURN') || null;

    return res.status(200).json({
      success: true,
      data: {
        outgoing,
        return: returnDoc,
        all: docs,
      },
    });
  } catch (error) {
    console.error('Error getDocumentsByBooking:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data dokumen rental', error: error.message });
  }
};
