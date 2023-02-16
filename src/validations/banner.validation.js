const Joi = require('joi');
const { objectId, multerFile } = require('./custom.validation');
const config = require('../config/config');
const { bannerStatus } = require('../utils/banners.utils');

const createBanners = {
  body: Joi.object()
    .keys({
      type: Joi.string()
        .required()
        .valid(...Object.values(config.bannerType)),
      startDate: Joi.number().required(),
      endDate: Joi.number().required(),
      seriesId: objectId.required(),
    })
    .required(),
  file: multerFile.required(),
};

const updateBanner = {
  params: Joi.object()
    .keys({
      bannerId: objectId.required(),
    })
    .required(),
  body: Joi.object().keys({
    type: Joi.string().valid(...Object.values(config.bannerType)),
    startDate: Joi.number(),
    endDate: Joi.number(),
    seriesId: objectId,
  }),
  file: multerFile,
};

const getBanner = {
  query: Joi.object().keys({
    status: Joi.string()
      .valid(...Object.values(bannerStatus))
      .default(bannerStatus.ACTIVE),
    forced: Joi.bool().default(false),
  }),
};

const deleteBanner = {
  params: Joi.object()
    .keys({
      bannerId: objectId.required(),
    })
    .required(),
};

module.exports = {
  createBanners,
  updateBanner,
  deleteBanner,
  getBanner,
};
