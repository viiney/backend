const { FileUpload } = require('../models');
const { capitalizeFirstLetterOfEachWord } = require('./pick');

const toSeries = (series) => {
  return {
    _id: series._id,
    name: capitalizeFirstLetterOfEachWord(series.name),
    description: capitalizeFirstLetterOfEachWord(series.description),
    createdAt: series.createdAt,
    images: series.image.map(FileUpload.s3Url),
    thumbnailImage: series.thumbnailImage ? FileUpload.s3Url(series.thumbnailImage) : '',
    isFree: series.isFree,
    order: series.order || Infinity,
    categoryId: series.categoryId,
    metaInfo: series.metaInfo,
  };
};

const toAuthor = async (author) => {
  const image = await FileUpload.findOne({ isDeleted: false, _id: author.image }).exec();

  return {
    _id: author._id,
    image: FileUpload.s3Url(image),
    name: author.name,
  };
};

const toSeriesForAuthor = async (series) => {
  const image = await FileUpload.findOne({ isDeleted: false, _id: series.images[0] }).exec();
  const thumbnailImage = await FileUpload.findOne({ isDeleted: false, _id: series.thumbnailImage }).exec();
  return {
    _id: series._id,
    name: capitalizeFirstLetterOfEachWord(series.name),
    description: capitalizeFirstLetterOfEachWord(series.description),
    createdAt: series.createdAt,
    images: FileUpload.s3Url(image),
    thumbnailImage: thumbnailImage ? FileUpload.s3Url(thumbnailImage) : '',
    isFree: series.isFree,
    order: series.order || Infinity,
    categoryId: series.categoryId,
    metaInfo: series.metaInfo,
  };
};

const commonPipeline = [
  {
    $lookup: {
      from: FileUpload.collectionName,
      localField: 'images',
      foreignField: '_id',
      as: 'image',
    },
  },
  {
    $lookup: {
      from: FileUpload.collectionName,
      localField: 'thumbnailImage',
      foreignField: '_id',
      as: 'thumbnailImage',
    },
  },
  {
    $unwind: { path: '$thumbnailImage', preserveNullAndEmptyArrays: true },
  },
];
module.exports = {
  toSeries,
  commonPipeline,
  toSeriesForAuthor,
  toAuthor,
};
