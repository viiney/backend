const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrUpdate = {
  body: Joi.object()
    .keys({
      playedAt: Joi.number().required(),
      playedTime: Joi.number().required(),
      episodeId: objectId.required(),
    })
    .required(),
};

const getAllHistory = {};
const deleteAllHistory = {};
const getTotalPlayedAndTimeCount = {};
const deleteHistory = {
  params: Joi.object()
    .keys({
      historyId: objectId.required(),
    })
    .required(),
};
module.exports = {
  createOrUpdate,
  getAllHistory,
  deleteAllHistory,
  deleteHistory,
  getTotalPlayedAndTimeCount,
};
