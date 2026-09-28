const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (folder) => {
  const uploadPath = path.join(process.env.UPLOAD_PATH || 'uploads', folder);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    },
  });
};

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Hanya file gambar yang diizinkan (jpeg, jpg, png, gif, webp)'));
};

const uploadAlat = multer({
  storage: createStorage('alat'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadUser = multer({
  storage: createStorage('users'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const uploadBukti = multer({
  storage: createStorage('bukti_bayar'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadCustomer = multer({
  storage: createStorage('customers'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const uploadPickupPhotos = multer({
  storage: createStorage('pickups'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per photo
});

const uploadReturnPhotos = multer({
  storage: createStorage('returns'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per photo
});

module.exports = {
  uploadAlat,
  uploadUser,
  uploadBukti,
  uploadCustomer,
  uploadPickupPhotos,
  uploadReturnPhotos,
};
