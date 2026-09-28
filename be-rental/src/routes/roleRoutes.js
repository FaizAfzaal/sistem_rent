const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const roleController = require('../controllers/roleController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate, authorize('admin'));

router.get('/', roleController.getAll);
router.get('/:id', roleController.getById);

router.post(
  '/',
  [body('nama_role').notEmpty().withMessage('Nama role wajib diisi')],
  validate,
  roleController.create
);

router.put(
  '/:id',
  [body('nama_role').notEmpty().withMessage('Nama role wajib diisi')],
  validate,
  roleController.update
);

router.delete('/:id', roleController.remove);

module.exports = router;
