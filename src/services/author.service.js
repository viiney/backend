const { Types } = require('mongoose');
const httpStatus = require('http-status');
const { uploadImageToS3 } = require('../utils/s3Utils');
const { Author, Series, AuthorSeries } = require('../models');
const { seriesService } = require('./index');
const ApiError = require('../utils/ApiError');
const { authorSeriesStatus, cacheAuthorSeriesThreshold } = require('../config/config');
const { toSeriesForAuthor, toAuthor } = require('../utils/series.utils');
const { getCacheObjectOrArray, cacheObjectOrArray } = require('../config/redis-cache');
const { getAuthorSeriesKey } = require('../config/redisKeys');

/**
 * @param {string} name
 * @param {Object} image
 * @param {string} image.fieldname
 * @param {string} image.originalname
 * @param {BufferEncoding} image.encoding
 * @param {string} image.mimetype
 * @param {number} image.size
 * @param {Buffer} image.buffer * @returns {Promise<void>}
 */
const createAuthor = async (name, image) => {
  const doc = {
    name,
  };
  if (image) {
    const imageIds = await uploadImageToS3([image]);
    // eslint-disable-next-line prefer-destructuring
    doc.image = imageIds[0];
  }
  await Author.create(doc);
};

const getAllAuthor = async () => {
  const authors = await Author.find({ isDeleted: false }).populate('image').exec();
  return authors.map((author) => {
    return {
      name: author.name,
      image: author.image.s3Url(),
      _id: author._id,
    };
  });
};

/**
 * @param {string} authorId
 * @param {string} name
 * @param {Object[]} image
 * @param {string} image.fieldname
 * @param {string} image.originalname
 * @param {BufferEncoding} image.encoding
 * @param {string} image.mimetype
 * @param {number} image.size
 * @param {Buffer} image.buffer * @returns {Promise<void>}
 */
const updateAuthor = async (authorId, name, imageBuffer) => {
  await Author.valid(authorId);
  const doc = {
    name,
  };
  if (imageBuffer) {
    const imageIds = await uploadImageToS3([imageBuffer]);
    // eslint-disable-next-line prefer-destructuring
    doc.image = imageIds[0];
  }
  const response = await Author.updateOne({ _id: Types.ObjectId(authorId) }, doc).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to update author');
  }
};

/**
 * @param {string} authorId
 * @returns {Promise<void>}
 */
const deleteAuthor = async (authorId) => {
  await Author.valid(authorId);
  const response = await AuthorSeries.deleteMany({
    author: Types.ObjectId(authorId),
  }).exec();
  if (!response.ok) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to de link from the author.');
  }
  const authorResp = await Author.updateOne({ _id: Types.ObjectId(authorId), isDeleted: false }, { isDeleted: true }).exec();
  if (authorResp.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete author');
  }
};

const getSeriesByStatus = (status, filter = {}) => {
  if (status === authorSeriesStatus.PROMOTED) {
    return AuthorSeries.find({ isPromoted: true, ...filter });
  }
  if (status === authorSeriesStatus.NON_PROMOTED) {
    return AuthorSeries.find({ isPromoted: false, ...filter });
  }
  return AuthorSeries.find(filter);
};

/**
 * @param {string} status
 * @returns {Promise<Awaited<{isPromoted: *, author: *, series: {createdAt: *, images: *, metaInfo: *, isFree: *, name: *, description: *, _id: *, thumbnailImage: *|string, categoryId: *}}>[]>}
 */
const getSeriesWithAuthors = async (status, forced) => {
  const key = getAuthorSeriesKey(status);
  if (!forced) {
    const val = await getCacheObjectOrArray(key);
    if (val) return val;
  }
  const authorSeriesList = await getSeriesByStatus(status).populate('series').populate('author').exec();
  const response = await Promise.all(
    authorSeriesList.map(async (authorSeries) => {
      const series = await toSeriesForAuthor(authorSeries.series);
      const author = await toAuthor(authorSeries.author);
      return {
        author,
        series,
        isPromoted: authorSeries.isPromoted,
      };
    })
  ).then((result) =>
    result.sort((a, b) => {
      return a.series.order - b.series.order;
    })
  );
  await cacheObjectOrArray(key, response, cacheAuthorSeriesThreshold);
  return response;
};

/**
 * @param {string} authorId
 * @returns {Promise<Awaited<{isPromoted: *, author: *, series: {createdAt: *, images: *, metaInfo: *, isFree: *, name: *, description: *, _id: *, thumbnailImage: *|string, categoryId: *}}>[]>} */
const getSeriesForAuthor = async (authorId) => {
  await Author.valid(authorId);
  const authorSeriesList = await getSeriesByStatus(authorSeriesStatus.ALL, { author: authorId })
    .populate('series')
    .populate('author')
    .exec();
  return Promise.all(
    authorSeriesList.map(async (authorSeries) => {
      const series = await toSeriesForAuthor(authorSeries.series);
      const author = await toAuthor(authorSeries.author);
      return {
        author,
        series,
        isPromoted: authorSeries.isPromoted,
      };
    })
  ).then((result) =>
    result.sort((a, b) => {
      return a.series.order - b.series.order;
    })
  );
};

/**
 * @returns {Promise<QueryResult>}
 */
const getAllSeriesWithoutAuthor = async () => {
  const allSeries = (await getSeriesByStatus(authorSeriesStatus.ALL).exec()).map((doc) => doc.series.toString());
  const series = await seriesService.getSeries({ forced: true });
  const seriesWithoutAuthor = series.results.filter((s) => !allSeries.includes(s._id.toString()));
  return {
    results: seriesWithoutAuthor,
    page: 1,
    limit: seriesWithoutAuthor.length,
    totalPages: 1,
    totalResults: seriesWithoutAuthor.length,
  };
};

/**
 * @param {string} seriesId
 * @param {string} authorId
 * @returns {Promise<void>}
 */
const linkSeriesToAuthor = async (seriesId, authorId) => {
  await Series.valid(seriesId);
  await Author.valid(authorId);
  const isAlreadyLinked = await AuthorSeries.isAlreadyLinked(seriesId);
  if (isAlreadyLinked) {
    throw new ApiError(httpStatus.CONFLICT, 'Already linked to some other author.');
  }
  await AuthorSeries.create({
    series: Types.ObjectId(seriesId),
    author: Types.ObjectId(authorId),
  });
};

/**
 * @param {string} seriesId
 * @param {string} authorId
 * @returns {Promise<void>}
 */
const linkSeriesToNewAuthor = async (seriesId, authorId) => {
  await Series.valid(seriesId);
  await Author.valid(authorId);
  const isAlreadyLinked = await AuthorSeries.isAlreadyLinked(seriesId);
  if (isAlreadyLinked) {
    const response = await AuthorSeries.updateOne(
      { series: Types.ObjectId(seriesId) },
      { author: Types.ObjectId(authorId) }
    ).exec();
    if (response.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to link');
    }
  } else {
    await AuthorSeries.create({
      series: Types.ObjectId(seriesId),
      author: Types.ObjectId(authorId),
    });
  }
};

/**
 * @param {string} seriesId
 * @param {string} authorId
 * @returns {Promise<void>}
 */
const deLinkSeries = async (seriesId, authorId) => {
  await Series.valid(seriesId);
  await Author.valid(authorId);
  const isAlreadyLinked = await AuthorSeries.isAlreadyLinked(seriesId);
  if (!isAlreadyLinked) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No Series is linked to the selected author');
  }
  const response = await AuthorSeries.deleteOne({
    series: Types.ObjectId(seriesId),
    author: Types.ObjectId(authorId),
  }).exec();
  if (!response.ok) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to de link from the author.');
  }
};

const promoteOrDemoteSeries = async (seriesId, isPromoted) => {
  await Series.valid(seriesId);
  const isAlreadyLinked = await AuthorSeries.isAlreadyLinked(seriesId);
  if (!isAlreadyLinked) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Series is not linked to any author');
  }
  const response = await AuthorSeries.updateOne({ series: Types.ObjectId(seriesId) }, { isPromoted }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to promote');
  }
};
module.exports = {
  createAuthor,
  deleteAuthor,
  updateAuthor,
  getAllAuthor,
  deLinkSeries,
  linkSeriesToNewAuthor,
  linkSeriesToAuthor,
  getAllSeriesWithoutAuthor,
  getSeriesForAuthor,
  getSeriesWithAuthors,
  promoteOrDemoteSeries,
};
