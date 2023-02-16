const Joi = require('joi');
const { objectId, multerFile } = require('./custom.validation');

const params = Joi.object()
  .keys({
    seriesId: objectId.required(),
  })
  .required();
const getSeries = Joi.object().keys({
  query: {
    limit: Joi.number(),
    page: Joi.number(),
    categoryId: objectId,
    searchTerm: Joi.string(),
    forced: Joi.bool().default(false),
  },
});

const updateSeries = {
  params,
  body: Joi.object().keys({
    name: Joi.string().allow(''),
    description: Joi.string().allow(''),
    isFree: Joi.bool(),
    categoryId: Joi.string().allow(''),
    order: Joi.number().allow(''),
    // authorId: Joi.string(),
    // isPromoted: Joi.bool().required(),
  }),
  files: Joi.object().keys({
    images: Joi.array().items(multerFile),
    thumbnailImage: Joi.array().items(multerFile),
  }),
};

const createSeries = {
  params: Joi.object()
    .keys({
      categoryId: objectId.required(),
    })
    .required(),
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string().required(),
      order: Joi.number().required(),
      isFree: Joi.bool().required(),
    })
    .required(),
  files: Joi.object()
    .keys({
      images: Joi.array().items(multerFile).required(),
      thumbnailImage: Joi.array().items(multerFile).required(),
    })
    .required(),
};
const deleteSeries = {
  params,
};

const createCategories = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().required(),
  }),
  file: multerFile,
};

module.exports = {
  getSeries,
  updateSeries,
  createSeries,
  deleteSeries,
  createCategories,
};
