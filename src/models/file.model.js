const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { toJSON } = require('./plugins');
const ApiError = require('../utils/ApiError');

const fileSchema = new mongoose.Schema(
  {
    bucketName: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    metaInfo: {
      type: Object,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);
// add plugin that converts mongoose to json
fileSchema.plugin(toJSON);

/**
 * @returns {string}
 */

fileSchema.methods.s3Url = function () {
  return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${this.key}`;
};
/**
 * @param {FileUpload} fileObj
 * @returns {string}
 */

fileSchema.statics.s3Url = function (fileObj) {
  return `https://${fileObj.bucketName}.s3.${fileObj.region}.amazonaws.com/${fileObj.key}`;
};

/**
 * @returns {null|number}
 */
fileSchema.methods.audioDuration = function() {
  if (this.metaInfo && this.metaInfo.duration) {
    return this.metaInfo.duration;
  }
  return null;
};

fileSchema.statics.valid = async function (fileId) {
  const category = await this.findOne({ _id: fileId, isDeleted: false }).exec();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, `File with fileId - ${fileId} not found`);
  }
};

/**
 * @typedef File
 */
const File = mongoose.model('File', fileSchema);
File.collectionName = 'files';
module.exports = File;
