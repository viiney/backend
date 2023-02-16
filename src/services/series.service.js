const httpStatus = require('http-status');
const { Types } = require('mongoose');
const ApiError = require('../utils/ApiError');
const { Series, Episode, PodcastCategory, FileUpload, Subscription } = require('../models');
const { uploadImageToS3, uploadAudioToS3 } = require('../utils/s3Utils');
const { pickWithNoEmpty, pick } = require('../utils/pick');
const { toEpisode } = require('../utils/episode.utils');
const { toSeries, commonPipeline } = require('../utils/series.utils');
const { throwNotFoundError } = require('../utils/ApiError');
const { getSeriesKey, getEpisodeKey } = require('../config/redisKeys');
const { getCacheObjectOrArray, cacheObjectOrArray } = require('../config/redis-cache');
const { cacheSeriesThreshold, cacheEpisodeThreshold } = require('../config/config');

/**
 * @param query
 * @param {number} [query.page]
 * @param {number} [query.limit]
 * @param {string} [query.categoryId]
 * @param {boolean} [query.forced]
 * @param {string} [query.searchTerm]
 * @returns {Promise<Array<QueryResult>>}
 */
const getSeries = async ({ page, limit, categoryId, searchTerm, forced }) => {
  // Checking in cache
  const seriesKey = getSeriesKey({ page, limit, categoryId, searchTerm });
  if (!forced) {
    const series = await getCacheObjectOrArray(seriesKey);
    if (series) return series;
  }

  const searchFilterOptions = ['name', 'description'];
  const searchFilter = searchTerm
    ? {
        $or: searchFilterOptions.map((key) => {
          return {
            [key]: { $regex: searchTerm, $options: 'i' },
          };
        }),
      }
    : {};
  const options = {
    limit,
    page,
  };
  let seriesList = [];
  if (categoryId) {
    await PodcastCategory.valid(categoryId);
    seriesList = await Series.paginate(
      {
        $and: [
          {
            categoryId: Types.ObjectId(categoryId),
            isDeleted: false,
          },
        ],
      },
      options,
      commonPipeline.concat([
        {
          $match: searchFilter,
        },
      ])
    );
  } else {
    seriesList = await Series.paginate(
      {
        $and: [
          {
            isDeleted: false,
          },
        ],
      },
      options,
      commonPipeline.concat([
        {
          $match: searchFilter,
        },
      ])
    );
  }

  const results = seriesList.results.map(toSeries).sort((a, b) => {
    return a.order - b.order;
  });
  const response = {
    ...seriesList,
    results,
  };
  await cacheObjectOrArray(seriesKey, response, cacheSeriesThreshold);
  return response;
};

/**
 * @param {string} name
 * @param {string} categoryId
 * @param {string} description
 * @param {boolean} isFree
 * @param {number} order
 * @param {Object[]} imageBuffers
 * @param {string} imageBuffers.fieldname
 * @param {string} imageBuffers.originalname
 * @param {string} imageBuffers.encoding
 * @param {string} imageBuffers.mimetype
 * @param {number} imageBuffers.size
 * @param {Buffer} imageBuffers.buffer
 * @param {Object[]} thumbnailImageBuffers
 * @param {string} thumbnailImageBuffers.fieldname
 * @param {string} thumbnailImageBuffers.originalname
 * @param {string} thumbnailImageBuffers.encoding
 * @param {string} thumbnailImageBuffers.mimetype
 * @param {number} thumbnailImageBuffers.size
 * @param {Buffer} thumbnailImageBuffers.buffer
 * @returns {Promise<Series>}
 */
const createSeries = async ({
  name,
  categoryId,
  description,
  isFree,
  order,
  imageBuffers = [],
  thumbnailImageBuffers = [],
}) => {
  await PodcastCategory.valid(categoryId);
  const imageIds = uploadImageToS3(imageBuffers);
  const thumbnailImageIds = uploadImageToS3(thumbnailImageBuffers);
  return Promise.all([imageIds, thumbnailImageIds])
    .then((results) =>
      Series.create({
        name,
        categoryId,
        description,
        isFree,
        order,
        images: [results[0][0]],
        thumbnailImage: results[1][0],
      })
    )
    .then((series) => series._id);
};

// TODO: Add isPromoted field
/**
 * @param {Object} seriesUpdate - Series Data to be updated
 * @param {string} [seriesUpdate.name]
 * @param {string} [seriesUpdate.description]
 * @param {string} [seriesUpdate.categoryId]
 * @param {boolean} [seriesUpdate.isFree]
 * @param {boolean} [seriesUpdate.authorId]
 * @param {Object[]} [image]
 * @param {string} image.fieldname
 * @param {string} image.originalname
 * @param {BufferEncoding} image.encoding
 * @param {string} image.mimetype
 * @param {number} image.size
 * @param {Buffer} image.buffer
 * @param {Object[]} [thumbnailImages]
 * @param {string} thumbnailImages.fieldname
 * @param {string} thumbnailImages.originalname
 * @param {BufferEncoding} thumbnailImages.encoding
 * @param {string} thumbnailImages.mimetype
 * @param {number} thumbnailImages.size
 * @param {Buffer} thumbnailImages.buffer
 * @returns {Promise<boolean>}*
 */
const updateSeries = async (seriesId, seriesUpdate, image, thumbnailImages) => {
  if (seriesUpdate.categoryId) {
    await PodcastCategory.valid(seriesUpdate.categoryId);
  }
  await Series.valid(seriesId);
  const allowedUpdates = ['name', 'description', 'categoryId', 'isFree', 'order'];
  const noneEmptyUpdate = pickWithNoEmpty(seriesUpdate, allowedUpdates);

  if (image) {
    const imageIds = await uploadImageToS3(image);
    // eslint-disable-next-line prefer-destructuring
    noneEmptyUpdate.images = [imageIds[0]];
  }
  if (thumbnailImages) {
    const thumbnailImageIds = await uploadImageToS3(thumbnailImages);
    // eslint-disable-next-line prefer-destructuring
    noneEmptyUpdate.thumbnailImage = thumbnailImageIds[0];
  }

  const response = await Series.updateOne({ _id: Types.ObjectId(seriesId), isDeleted: false }, noneEmptyUpdate).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to update series');
  }
  return true;
};

/**
 * @param {string} episodeId
 * @returns {Promise<boolean>}
 */
const softDeleteEpisodeForSeries = async (episodeId) => {
  await Episode.valid(episodeId);
  const episode = await Episode.findOne({ _id: episodeId }, { isDeleted: true }).exec();
  const response = await Episode.updateOne({ _id: episodeId }, { isDeleted: true }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete episode');
  }
  if (episode.images) {
    const imageResponse = await FileUpload.updateMany({ _id: { $in: episode.images } }, { isDeleted: true }).exec();
    if (imageResponse.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete images');
    }
  }
  return true;
};

/**
 * @param {string} seriesId
 * @returns {Promise<boolean>}
 */
const softDeleteSeries = async (seriesId) => {
  await Series.valid(seriesId);

  const episodes = await Episode.find({ seriesId: Types.ObjectId(seriesId), isDeleted: false }).exec();
  await Promise.all(episodes.map((ep) => softDeleteEpisodeForSeries(ep._id)));

  const series = await Series.findOne({ _id: Types.ObjectId(seriesId) }, { isDeleted: true }).exec();
  if (series.images) {
    const imageResponse = await FileUpload.updateMany({ _id: { $in: series.images } }, { isDeleted: true }).exec();
    if (imageResponse.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete series images');
    }
  }

  if (series.thumbnailImage) {
    const thumbImageResponse = await FileUpload.updateMany({ _id: series.thumbnailImage }, { isDeleted: true }).exec();
    if (thumbImageResponse.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete series thumbnailImage');
    }
  }
  const response = await Series.updateOne({ _id: Types.ObjectId(seriesId) }, { isDeleted: true }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete series');
  }
  return true;
};

/**
 * @param {string} episodeId
 * @param {Role} [role]
 * @param {string} [userId]
 * @returns {Promise<string>}
 */
const getAudioForEpisode = async (episodeId, role, userId) => {
  const episode = await Episode.findOne({ _id: Types.ObjectId(episodeId), isDeleted: false })
    .populate('audio')
    .populate('seriesId')
    .exec();
  throwNotFoundError(!episode, 'Episode not found.');

  const isAllowedToView = episode.seriesId.isFree || episode.isFree;

  if (isAllowedToView) {
    return episode.audio.s3Url();
  }
  return Subscription.findSubscriptionValidTill(userId).then((subscriptionTill) => {
    const isPremiumUser = Date.now() >= subscriptionTill;
    if (isPremiumUser) {
      return episode.audio.s3Url();
    }
    throw new ApiError(httpStatus.FORBIDDEN, 'Sorry this is premium content');
  });
};

/**
 * @param {string} seriesId
 * @param {boolean} forced
 * @returns {Promise<Array<Episode>>}
 */
const getAllEpisodeForSeries = async (seriesId, forced) => {
  const key = getEpisodeKey(seriesId);
  if (!forced) {
    const episodes = await getCacheObjectOrArray(key);
    if (episodes) return episodes;
  }
  await Series.valid(seriesId);
  const response = await Episode.find({ seriesId, isDeleted: false }).sort({ order: 'asc' }).exec();

  return Promise.all(response.map(toEpisode)).then((resp) => {
    return cacheObjectOrArray(key, resp, cacheEpisodeThreshold).then(() => resp);
  });
};

/**
 * @param {string} seriesId
 * @returns {Promise<Array<Episode>>}
 */
const getAllEpisode = async () => {
  const key = 'all-episodes';
  const episodes = await getCacheObjectOrArray(key);
  if (episodes) return episodes;
  const response = await Episode.find({ isDeleted: false }).exec();
  return Promise.all(response.map(toEpisode)).then((resp) => {
    return cacheObjectOrArray(key, resp, cacheEpisodeThreshold).then(() => resp);
  });
};

/**
 * @param {string} episodeId
 * @returns {Promise<{imagesUrls: *, createdAt: *, audioUrl: *, isFree: *, name: *, description: *, id: *, order: *}>}
 */
const getEpisode = async (episodeId) => {
  const response = await Episode.findOne({ _id: Types.ObjectId(episodeId), isDeleted: false }).exec();
  throwNotFoundError(!response, 'Episode not found');
  return toEpisode(response);
};

/**
 * @param {string} seriesId
 * @param {Object} episodeBody
 * @param {string} episodeBody.name
 * @param {number} episodeBody.order
 * @param {number} episodeBody.isFree
 * @param {string} episodeBody.description

 * @param {Object} audio
 * @param {string} audio.fieldname
 * @param {string} audio.originalname
 * @param {BufferEncoding} audio.encoding
 * @param {string} audio.mimetype
 * @param {number} audio.size
 * @param {Buffer} audio.buffer
 * @return {Promise<void>}
 */
const createEpisodeForSeries = async (seriesId, episodeBody, audio) => {
  await Series.valid(seriesId);
  const canMoreAudioBeFree = await Episode.canMoreAudioBeFree(seriesId);
  if (!canMoreAudioBeFree && episodeBody.isFree) {
    throw new ApiError(httpStatus.CONFLICT, 'Already has episode with as free episode');
  }
  const hasSameOrder = await Episode.hasWithSameOrder(seriesId, episodeBody.order);
  if (hasSameOrder) {
    throw new ApiError(httpStatus.CONFLICT, 'Already has episode with same order number');
  }
  const audioId = await uploadAudioToS3(audio);
  const episodeDoc = {
    name: episodeBody.name,
    order: episodeBody.order,
    description: episodeBody.description,
    isFree: episodeBody.isFree,
    audio: audioId,
    images: [],
    seriesId,
  };
  try {
    const episode = await Episode.create(episodeDoc);
    return episode._id;
  } catch (e) {
    throw new ApiError(httpStatus.BAD_GATEWAY, e.message);
  }
};

/**
 * @param {Object} episodeUpdate - Episode Data to be updated
 * @param {string} [episodeUpdate.name]
 * @param {string} [episodeUpdate.description]
 * @param {boolean} [episodeUpdate.isFree]
 * @param {number} [episodeUpdate.order]
 * @param {string} episodeId - Episode Object Id
 * @param {string} seriesId - Series Object Id
 * @returns {Promise<boolean>}*
 */
const updateEpisode = async (seriesId, episodeId, episodeUpdate, audioBuffer) => {
  await Series.valid(seriesId);
  await Episode.valid(episodeId);
  const allowedUpdates = ['name', 'description', 'isFree', 'order'];
  const noneEmptyUpdate = pick(episodeUpdate, allowedUpdates);
  if (noneEmptyUpdate.isFree) {
    const canMoreAudioBeFree = await Episode.canMoreAudioBeFree(seriesId);
    if (!canMoreAudioBeFree) {
      throw new ApiError(httpStatus.CONFLICT, 'Already has episode with as free episode');
    }
  }
  if (noneEmptyUpdate.order) {
    const hasSameOrder = await Episode.hasWithSameOrder(seriesId, noneEmptyUpdate.order);
    if (hasSameOrder) throw new ApiError(httpStatus.CONFLICT, 'Already has audio with same order number');
  }

  if (audioBuffer) {
    const audioId = await uploadAudioToS3(audioBuffer);
    noneEmptyUpdate.audio = audioId;
  }
  const response = await Episode.updateOne({ _id: Types.ObjectId(episodeId) }, noneEmptyUpdate).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to update episode');
  }
  return true;
};

/**
 * @returns {Promise<Array<PodcastCategory>}
 */
const getCategories = async () => {
  const podcasts = await PodcastCategory.find({ isDeleted: false }, { name: 1, _id: 1, description: 1, image: 1, isAllAudioFree: 1 })
    .populate('image')
    .exec();
  return podcasts.map((podcast) => {
    return {
      name: podcast.name,
      _id: podcast._id,
      description: podcast.description,
      image: podcast.image.s3Url(),
      isFree: podcast.isAllAudioFree,
    };
  });
};

/**
 * @param {string} name
 * @param {string} description
 * @param {Object} imageStream
 * @param {string} imageStream.fieldname
 * @param {string} imageStream.originalname
 * @param {string} imageStream.encoding
 * @param {string} imageStream.mimetype
 * @param {number} imageStream.size
 * @param {Buffer} imageStream.buffer
 * @returns {Promise<string>}
 */
const createCategory = async (name, description, imageStream) => {
  const imageIds = await uploadImageToS3([imageStream]);
  const category = await PodcastCategory.create({
    name,
    description,
    image: imageIds[0] ? imageIds : null,
  });
  return category._id;
};

module.exports = {
  createSeries,
  createEpisodeForSeries,
  createCategory,
  softDeleteEpisodeForSeries,
  softDeleteSeries,
  updateEpisode,
  updateSeries,
  getSeries,
  getAllEpisodeForSeries,
  getCategories,
  getAudioForEpisode,
  getEpisode,
  getAllEpisode,
};
