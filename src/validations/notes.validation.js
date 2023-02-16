const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrUpdateNote = {
  body: Joi.object().keys({
    notes: Joi.string().required().min(1),
    seriesId: objectId.required(),
  }),
};

const deleteNote = {
  params: Joi.object().keys({
    noteId: objectId.required(),
  }),
};

const getNote = {
  query: Joi.object().keys({
    seriesId: objectId.default('all'),
  }),
};

module.exports = {
  createOrUpdateNote,
  getNote,
  deleteNote,
};
