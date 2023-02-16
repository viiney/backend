const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { Types } = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const ApiError = require('../utils/ApiError');
const { PodcastCategory, FileUpload } = require('./index');

const seriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: PodcastCategory.modelName,
    },
    order: {
      type: Number,
      required: true,
    },
    images: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: FileUpload.modelName,
      required: true,
    },
    thumbnailImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: FileUpload.modelName,
      required: true,
    },
    metaInfo: {
      type: Object,
      required: false,
      default: null,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
seriesSchema.plugin(toJSON);
seriesSchema.plugin(paginate);

/**
 * @param {string} seriesId
 * @returns {Promise<boolean>}
 */
seriesSchema.statics.valid = async function (seriesId) {
  const category = await this.findOne({ _id: Types.ObjectId(seriesId), isDeleted: false }).exec();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, `Series with series - ${seriesId} not found`);
  }
};

/**
 * @typedef Series
 */
const Series = mongoose.model('Series', seriesSchema);
Series.collectionName = 'series';
module.exports = Series;
