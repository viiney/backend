const express = require('express');
const { seriesController } = require('../../controllers');
const auth = require('../../middlewares/auth');
const { rights } = require('../../config/roles');
const validate = require('../../middlewares/validate');
const { seriesValidation } = require('../../validations');
const { upload } = require('../../middlewares/multer');

const router = express.Router();

router.get('/', seriesController.getCategories);
router.post(
  '/',
  auth(rights.CREATE_CATEGORIES),
  upload.single('image'),
  validate(seriesValidation.createCategories),
  seriesController.createCategories
);

module.exports = router;



