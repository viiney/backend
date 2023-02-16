const { Types } = require('mongoose');
const httpStatus = require('http-status');
const { Banner, FileUpload, Series } = require('../models');
const { uploadImageToS3 } = require('../utils/s3Utils');
const ApiError = require('../utils/ApiError');
const { bannerStatus } = require('../utils/banners.utils');
const { capitalizeFirstLetterOfEachWord } = require('../utils/pick');
const { getBannerKey } = require('../config/redisKeys')
const { getCacheObjectOrArray, cacheObjectOrArray } = require('../config/redis-cache')
const { cacheEpisodeThreshold, cacheBannerThreshold } = require('../config/config')

const commonPipeline = [
  {
    $project: {
      type: 1,
      image: 1,
      startDate: 1,
      endDate: 1,
      seriesId: 1,
    },
  },
  {
    $lookup: {
      from: Series.collectionName,
      localField: 'seriesId',
      foreignField: '_id',
      as: 'series',
      pipeline: [
        {
          $project: {
            name: 1,
            _id: 1,
            description: 1,
            images: 1,
            thumbnailImage: 1,
            categoryId: 1,
            isFree: 1,
            createdAt: 1,
            metaInfo: 1,
          },
        },
        {
          $lookup: {
            from: FileUpload.collectionName,
            localField: 'images',
            foreignField: '_id',
            as: 'images',
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
      ],
    },
  },
  {
    $project: {
      type: 1,
      image: 1,
      startDate: 1,
      endDate: 1,
      series: 1,
    },
  },
  {
    $unwind: { path: '$series', preserveNullAndEmptyArrays: true },
  },
  {
    $lookup: {
      from: FileUpload.collectionName,
      localField: 'image',
      foreignField: '_id',
      as: 'image',
    },
  },
];
const createBanner = async (type, startDate, endDate, seriesId, image) => {
  await Series.valid(seriesId);
  const imageId = await uploadImageToS3([image]);

  // start date should be smaller than end date
  const bannerDetails = {
    type,
    startDate,
    endDate,
    image: imageId,
    seriesId,
  };
  await Banner.create(bannerDetails);
};

/**
 * @param {all | expired | active} status
 * @param {boolean}forced
 * @returns {Promise<*|Array|Object|T[]>}
 */
const getBannerByStatus = async (status, forced) => {
  const key = getBannerKey(status);
  if (!forced) {
    const resp = await getCacheObjectOrArray(key);
    if (resp) return resp;
  }
  let banners = [];
  const matchFilter = {
    $match: {},
  };
  const todayDate = new Date().getTime();
  if (status === bannerStatus.EXPIRED) {
    matchFilter.$match = {
      $and: [{ endDate: { $lte: todayDate } }, { isDeleted: false }],
    };
  } else if (status === bannerStatus.ACTIVE) {
    matchFilter.$match = {
      $and: [{ startDate: { $lte: todayDate } }, { endDate: { $gte: todayDate } }, { isDeleted: false }],
    };
  } else {
    matchFilter.$match = {
      isDeleted: false,
    };
  }
  banners = await Banner.aggregate([matchFilter, ...commonPipeline]).exec();
  const results = banners.map((banner) => {
    /* eslint-disable no-param-reassign */
    banner.image = FileUpload.s3Url(banner.image[0]);
    banner.series.name = capitalizeFirstLetterOfEachWord(banner.series.name);
    banner.series.description = capitalizeFirstLetterOfEachWord(banner.series.description);
    banner.series.images = banner.series.images.map(FileUpload.s3Url);
    banner.series.thumbnailImage = banner.series.thumbnailImage ? FileUpload.s3Url(banner.series.thumbnailImage) : '';
    return banner;
  });
  await cacheObjectOrArray(key, banners, cacheBannerThreshold);
  return results;
};

const updateBanner = async (bannerId, updateBody, image) => {
  await Banner.valid(bannerId);
  if (updateBody.seriesId) {
    await Series.valid(updateBody.seriesId);
  }
  const updateDoc = { ...updateBody };
  if (image) {
    const imageId = await uploadImageToS3([image]);
    updateDoc.image = imageId;
  }
  const id = Types.ObjectId(bannerId);
  const response = await Banner.updateOne({ _id: id, isDeleted: false }, updateDoc);
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to update.');
  }
  return true;
};

const deleteBanner = async (bannerId) => {
  await Banner.valid(bannerId);
  const id = Types.ObjectId(bannerId);
  const response = await Banner.updateOne({ _id: id }, { isDeleted: true });
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete banner');
  }
  return true;
};

module.exports = {
  createBanner,
  getBannerByStatus,
  updateBanner,
  deleteBanner,
};
