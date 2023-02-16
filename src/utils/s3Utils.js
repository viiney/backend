const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuid } = require('uuid');
// const axios = require('axios');
const config = require('../config/config');
const service = require('../services/index');
const mimeTypeValidation = require('./mimeTypeValidation');
// const { FileUpload } = require('../models');

// const getDurationOfAudio = async (s3Url) => {
//   const stream = await axios.get(s3Url, { responseType: 'stream' });
//   // console.log(stream.data)
//   const metadata = await parseStream(stream.data);
//   return metadata.format.duration;
// };
/**
 * @param {Object} file
 * @param {string} file.fieldname
 * @param {string} file.originalname
 * @param {BufferEncoding} file.encoding
 * @param {string} file.mimetype
 * @param {number} file.size
 * @param {Buffer} file.buffer
 * @param {string} prefix
 * @returns {Promise<string>}
 */
const uploadS3 = async (file, prefix) => {
  const s3 = new S3Client({
    region: config.s3Config.s3RegionName,
    credentials: {
      accessKeyId: config.s3Config.s3AccessKeyId,
      secretAccessKey: config.s3Config.s3AccessKeySecret,
    },
    tls: true,
  });
  const fileType = file.mimetype.split('/')[1];
  const Key = `${prefix}/${uuid()}.${fileType}`;
  const input = {
    ACL: 'public-read',
    Body: file.buffer,
    Bucket: config.s3Config.s3BucketName,
    ContentType: file.mimetype,
    Key,
    ContentLength: file.size,
    ChecksumAlgorithm: 'SHA256',
  };
  const putObjectCommandOutput = await s3.send(new PutObjectCommand(input));
  const metaInfo = putObjectCommandOutput.$metadata;
  // if (file.mimetype.includes('audio')) {
  //   metaInfo.duration = await getDurationOfAudio(
  //     FileUpload.s3Url({
  //       bucket: config.s3Config.s3BucketName,
  //       region: config.s3Config.s3RegionName,
  //       key: Key,
  //     })
  //   );
  // }
  const fileId = await service.fileService.createFile({
    fileName: input.Key,
    fileSize: input.ContentLength,
    bucketName: input.Bucket,
    region: config.s3Config.s3RegionName,
    contentType: input.ContentType,
    metaInfo,
  });
  return fileId;
};

/**
 * @param {Object} audioBuffer
 * @param {string} audioBuffer.fieldname
 * @param {string} audioBuffer.originalname
 * @param {BufferEncoding} audioBuffer.encoding
 * @param {string} audioBuffer.mimetype
 * @param {number} audioBuffer.size
 * @param {Buffer} audioBuffer.buffer
 * @return {Promise<string>}
 */
const uploadAudioToS3 = (audioBuffer) => {
  mimeTypeValidation.validAudioType(audioBuffer.mimetype);
  return uploadS3(audioBuffer, 'audio');
};
/**
 * @param {{fieldname: string, originalname: string, encoding: string, mimetype: string, size: number, buffer: Buffer}[]} imageBuffers
 * @param {string} imageBuffers.fieldname
 * @param {string} imageBuffers.originalname
 * @param {BufferEncoding} imageBuffers.encoding
 * @param {string} imageBuffers.mimetype
 * @param {number} imageBuffers.size
 * @param {Buffer} imageBuffers.buffer
 * @return {Promise<Array<string>>}
 */
const uploadImageToS3 = (imageBuffers) => {
  if (imageBuffers.length === 0) {
    return [];
  }
  imageBuffers.forEach((image) => mimeTypeValidation.validImageType(image.mimetype));
  return Promise.all(imageBuffers.map((image) => uploadS3(image, 'image')));
};

module.exports = {
  uploadImageToS3,
  uploadAudioToS3,
  // getDurationOfAudio,
};
