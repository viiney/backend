const Joi = require('joi');
const { objectId, multerFile } = require('./custom.validation');

const getAllEpisode = Joi.object().keys({
  params: Joi.object()
    .keys({
      seriesId: objectId.required(),
    })
    .required(),
  query: Joi.object({
    forced: Joi.bool().default(false)
  }),
});

const updateEpisode = {
  params: Joi.object()
    .keys({
      seriesId: objectId.required(),
      episodeId: objectId.required(),
    })
    .required(),
  body: Joi.object().keys({
    name: Joi.string().allow(''),
    description: Joi.string().allow(''),
    isFree: Joi.bool(),
    order: Joi.number().integer().positive().allow(''),
  }),
  file: multerFile,
};

const createEpisode = {
  params: Joi.object()
    .keys({
      seriesId: objectId.required(),
    })
    .required(),
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string().required(),
      order: Joi.number().integer().positive().required(),
      isFree: Joi.bool().required(),
    })
    .required(),
  files: Joi.object().keys({
    // images: Joi.array().items(multerFile),
    audio: Joi.array().items(multerFile).required(),
  }),
};

const deleteEpisode = {
  params: Joi.object()
    .keys({
      episodeId: objectId.required(),
    })
    .required(),
};
const getRecording = {
  params: Joi.object()
    .keys({
      episodeId: objectId.required(),
    })
    .required(),
};
const getEpisode = {
  params: Joi.object()
    .keys({
      episodeId: objectId.required(),
    })
    .required(),
};


module.exports = {
  getAllEpisode,
  getEpisode,
  updateEpisode,
  createEpisode,
  deleteEpisode,
  getRecording,
};
