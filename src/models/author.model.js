const mongoose = require('mongoose');
const { Types } = require('mongoose');
const httpStatus = require('http-status');
const { toJSON, paginate } = require('./plugins');
const { FileUpload } = require('./index');
const ApiError = require('../utils/ApiError');

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: FileUpload.modelName,
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
authorSchema.plugin(toJSON);
authorSchema.plugin(paginate);

/**
 * @param {string} authorId
 * @returns {Promise<boolean>}
 */
authorSchema.statics.valid = async function (authorId) {
  const doc = await this.findOne({ _id: Types.ObjectId(authorId), isDeleted: false }).exec();
  if (!doc) {
    throw new ApiError(httpStatus.NOT_FOUND, `Author not found`);
  }
};

/**
 * @typedef Author
 */
const Banner = mongoose.model('Author', authorSchema);
Banner.collectionName = 'authors';

module.exports = Banner;
