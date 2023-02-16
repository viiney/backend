
const httpStatus = require('http-status');
const ApiError = require('./ApiError');
const logger = require('../config/logger');

/** Validate audio type
 * @param {string} mimeType
 * @returns {boolean}
 */
const validAudioType = (mimeType) => {
  logger.info(`mimeType for Audio: ${mimeType}`);
  // const mimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'application/octet-stream'];
  // const isValid = mimeTypes.includes(mimeType);
  // if (!isValid) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, `Please select one of this type ${mimeType}`);
  // }
};

/**
 * Validate image type
 * @param {string} mimeType
 * @returns {boolean}
 */
const validImageType = (mimeType) => {
  logger.info(`mimeType for Audio: ${mimeType}`);
  // const mimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/octet-stream'];
  // const isValid = mimeTypes.includes(mimeType);
  // if (!isValid) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, `Please select one of this type ${mimeType}`);
  // }
};

module.exports = {
  validImageType,
  validAudioType,
};
