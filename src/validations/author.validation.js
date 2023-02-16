const Joi = require('joi');
const { multerFile, objectId } = require('./custom.validation');
const { authorSeriesStatus } = require('../config/config');

const createAuthor = {
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
    })
    .required(),
  file: multerFile.required(),
};

const getAuthors = {};

const updateAuthor = {
  params: Joi.object({
    authorId: objectId.required(),
  }).required(),
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
    })
    .required(),
  file: multerFile.required(),
};

const deleteAuthor = {
  params: Joi.object({
    authorId: objectId.required(),
  }).required(),
};

const linkOrDelinkSeries = {
  body: Joi.object()
    .keys({
      authorId: objectId.required(),
      seriesId: objectId.required(),
    })
    .required(),
};

const promoteOrDemoteSeries = {
  body: Joi.object()
    .keys({
      isPromoted: Joi.boolean().required(),
      seriesId: objectId.required(),
    })
    .required(),
};

const getSeriesWithAuthor = {
  query: Joi.object()
    .keys({
      status: Joi.string()
        .valid(...Object.values(authorSeriesStatus))
        .required(),
      forced: Joi.bool().default(false),
    })
    .required(),
};

const getSeriesForAuthor = {
  params: Joi.object({
    authorId: objectId.required(),
  }).required(),
};

module.exports = {
  deleteAuthor,
  createAuthor,
  getAuthors,
  updateAuthor,
  linkOrDelinkSeries,
  getSeriesWithAuthor,
  getSeriesForAuthor,
  promoteOrDemoteSeries,
};
