const express = require('express');
const auth = require('../../middlewares/auth');
const { rights } = require('../../config/roles');
const { bannerController } = require('../../controllers');
const { upload } = require('../../middlewares/multer');
const validate = require('../../middlewares/validate');
const { bannerValidation } = require('../../validations');

const router = express.Router();

router.post(
  '/',
  auth(rights.MANAGE_BANNER),
  upload.single('image'),
  validate(bannerValidation.createBanners),
  bannerController.createBanners
);
router.get(
  '/',
  auth(rights.GET_BANNER, rights.MANAGE_BANNER),
  validate(bannerValidation.getBanner),
  bannerController.getBanner
);
router.put(
  '/:bannerId',
  auth(rights.MANAGE_BANNER),
  upload.single('image'),
  validate(bannerValidation.updateBanner),
  bannerController.updateBanner
);
router.delete(
  '/:bannerId',
  auth(rights.MANAGE_BANNER),
  validate(bannerValidation.deleteBanner),
  bannerController.deleteBanner
);

module.exports = router;
