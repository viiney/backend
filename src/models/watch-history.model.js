const mongoose = require('mongoose');
const { Schema, Types } = require('mongoose');
const httpStatus = require('http-status');
const { toJSON, paginate } = require('./plugins');
const config = require('../config/config');
const { User, Episode } = require('./index');
const ApiError = require('../utils/ApiError');

const playHistorySchema = Schema({
  playedTill: {
    type: Number,
    required: true,
  },
  playedAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
});
const watchHistorySchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: User.modelName,
    },
    playHistory: {
      type: [playHistorySchema],
      required: false,
    },
    historyType: {
      type: String,
      required: true,
      enum: Object.keys(config.historyType),
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Episode.modelName,
      default: null,
    },
    metaInfo: {
      type: Object,
      required: false,
      default: null,
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
watchHistorySchema.plugin(toJSON);
watchHistorySchema.plugin(paginate);

/**
 * @param {string} episodeId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
watchHistorySchema.statics.alreadyExist = async function (episodeId, userId) {
  const history = await this.findOne({
    userId: Types.ObjectId(userId),
    episodeId: Types.ObjectId(episodeId),
    isDeleted: false,
  }).exec();
  return !!history;
};
/**
 * @param {string} historyId
 * @returns {Promise<void>}
 */
watchHistorySchema.statics.valid = async function (historyId) {
  const category = await this.findOne({ _id: historyId, isDeleted: false }).exec();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, `History with historyId - ${historyId} not found`);
  }
};
/**
 * @typedef WatchHistory
 */
const collectionName = 'histories';
const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema, collectionName);
WatchHistory.collectionName = collectionName;
module.exports = WatchHistory;
