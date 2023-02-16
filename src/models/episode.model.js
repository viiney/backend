const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { Types } = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { Series, FileUpload } = require('./index');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const episodeSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Series.modelName,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: false,
    },
    audio: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: FileUpload.modelName,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [mongoose.Schema.Types.ObjectId],
      required: false,
      ref: FileUpload.modelName,
      default: [],
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
episodeSchema.plugin(toJSON);
episodeSchema.plugin(paginate);

/**
 * @param {string} seriesId
 * @returns {Promise<boolean>}
 */
episodeSchema.statics.canMoreAudioBeFree = async function (seriesId) {
  const count = await this.find({
    $and: [{ seriesId: Types.ObjectId(seriesId) }, { isFree: true }, { isDeleted: false }],
  })
    .count()
    .exec();
  const series = await Series.findOne({ _id: Types.ObjectId(seriesId), isDeleted: false }).exec();
  return series.isFree || count < config.totalFreeEpisodeInSeries;
};

episodeSchema.statics.hasWithSameOrder = async function (seriesId, order) {
  const count = await this.find({
    $and: [{ seriesId: Types.ObjectId(seriesId) }, { order }, { isDeleted: false }],
  })
    .count()
    .exec();
  return count > 0;
};

/**
 * @param {string} episodeId
 * @returns {Promise<boolean>}
 */
episodeSchema.statics.valid = async function (episodeId) {
  const category = await this.findOne({ _id: Types.ObjectId(episodeId), isDeleted: false }).exec();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, `Episode with episodeId - ${episodeId} not found`);
  }
};

/**
 * @param {string} episodeId
 * @param {string} seriesId
 * @returns {Promise<void>}
 */
episodeSchema.statics.validForSeries = async function (episodeId, seriesId) {
  const episode = await this.findOne({
    _id: Types.ObjectId(episodeId),
    seriesId: Types.ObjectId(seriesId),
    isDeleted: false,
  }).exec();
  if (!episode) {
    throw new ApiError(httpStatus.NOT_FOUND, `Episode with episodeId - ${episodeId} not found in the series: ${seriesId}`);
  }
};
episodeSchema.pre('find', function () {
  this.populate('audio');
  // this.populate('images');
  this.populate('seriesId');
});
episodeSchema.pre('findOne', function () {
  this.populate('audio');
  // this.populate('images');
  this.populate('seriesId');
});
/**
 * @typedef Episode
 */
const Episode = mongoose.model('Episode', episodeSchema);
Episode.collectionName = 'episodes';
module.exports = Episode;
