const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const config = require('../config/config');
const { FileUpload, Series} = require('./index');
const {Types} = require("mongoose");
const ApiError = require("../utils/ApiError");
const httpStatus = require("http-status");

const bannerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: Object.keys(config.bannerType),
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: FileUpload.modelName,
    },
    startDate: {
      type: Number,
      required: true,
    },
    endDate: {
      type: Number,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Series.modelName,
      default: null,
    },
    metaInfo: {
      type: Object,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
bannerSchema.plugin(toJSON);
bannerSchema.plugin(paginate);

/**
 * @param {string} bannerId
 * @returns {Promise<boolean>}
 */
bannerSchema.statics.valid = async function (bannerId) {
  const doc = await this.findOne({ _id: Types.ObjectId(bannerId), isDeleted: false }).exec();
  if (!doc) {
    throw new ApiError(httpStatus.NOT_FOUND, `Banner with bannerId - ${bannerId} not found`);
  }
};

/**
 * @typedef Banner
 */
const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
