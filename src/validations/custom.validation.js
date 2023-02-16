const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const phoneNumber = Joi.string().min(10).max(10).example('7891300133');
const otp = Joi.string().min(6).max(6).alphanum();

const multerFile = Joi.object().keys({
  fieldname: Joi.string().required(),
  originalname: Joi.string().required(),
  encoding: Joi.string().required(),
  mimetype: Joi.string().required(),
  size: Joi.number().required(),
  buffer: Joi.binary().required(),
});

const dob = Joi.number().integer().positive();

module.exports = {
  objectId: Joi.string().custom(objectId),
  phoneNumber,
  otp,
  multerFile,
  dob
};
