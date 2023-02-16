const Joi = require('joi');
const { roles } = require('../config/roles');
const { objectId, multerFile, phoneNumber, dob } = require('./custom.validation');

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string().valid(...roles),
    email: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().default(10),
    page: Joi.number().integer().default(1),
  }),
};

const getUser = {};
const getUserById = {
  params: Joi.object()
    .keys({
      userId: objectId.required(),
    })
    .required(),
};

const updateUser = {
  body: Joi.object().keys({
    email: Joi.string().email().allow(''),
    name: Joi.string().allow(''),
    description: Joi.string().allow(''),
    dob: dob.allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    preparingFor: Joi.string().allow(''),
    qualification: Joi.string().allow(''),
    occupation: Joi.string().allow(''),
  }),
  file: multerFile,
};

const createAdmin = {
  body: Joi.object()
    .keys({
      email: Joi.string().email().required(),
      name: Joi.string().required(),
      phoneNumber: phoneNumber.required(),
      dob: dob.required(),
    })
    .required(),
  file: multerFile.required(),
};

const deleteUser = {
  params: Joi.object()
    .keys({
      userId: objectId.required(),
    })
    .required(),
};

const provideAdminAccess = {
  params: Joi.object()
    .keys({
      userId: objectId.required(),
    })
    .required(),
};

const countReferralCount = {
  body: Joi.object()
    .keys({
      referralCode: Joi.string().required(),
      signupUserId: objectId.required(),
      metaInfo: Joi.object().default({}),
    })
    .required(),
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserById,
  provideAdminAccess,
  createAdmin,
  countReferralCount,
};
