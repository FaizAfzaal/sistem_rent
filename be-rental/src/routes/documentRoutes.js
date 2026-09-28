const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { uploadReturnPhotos } = require('../middleware/upload');

// Public PDF Download Route (Allows direct download without authorization header error in new browser tab)
router.get('/:id/download', documentController.downloadDocument);

// Authenticated Routes
router.use(authenticate);

// Fitur 1: Dokumen Serah Terima Barang Keluar
router.post('/outgoing/sign', documentController.saveOutgoingSign);
router.post('/outgoing/pdf', documentController.generateOutgoingPDFRoute);

// Fitur 2: Dokumen Pengembalian Barang
router.post('/return/sign', uploadReturnPhotos.array('photos', 5), documentController.saveReturnSign);
router.post('/return/pdf', uploadReturnPhotos.array('photos', 5), documentController.generateReturnPDFRoute);

// Fetch PDF Documents status
router.get('/booking/:bookingId', documentController.getDocumentsByBooking);

module.exports = router;
