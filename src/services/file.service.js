const { FileUpload } = require('../models');

/**
 * @param {Object} body
 * @param {string} body.fileName
 * @param {string} body.bucketName
 * @param {string} body.region
 * @param {number} body.fileSize
 * @param {string} body.contentType
 * @param {Object} body.metaInfo
 */
const createFile = async (body) => {
  const fileDoc = {
    key: body.fileName,
    bucketName: body.bucketName,
    region: body.region,
    size: body.fileSize,
    contentType: body.contentType,
    metaInfo: body.metaInfo,
  };
  const file = await FileUpload.create(fileDoc);
  return file._id;
};

module.exports = {
  createFile,
};
