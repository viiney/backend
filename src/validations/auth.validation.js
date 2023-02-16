const Joi = require('joi');
const { phoneNumber, otp, dob } = require('./custom.validation');

const register = {
  body: Joi.object()
    .keys({
      email: Joi.string().required().email(),
      name: Joi.string().required(),
      phoneNumber: phoneNumber.required(),
      dob: dob.default(null),
    })
    .required(),
};

const login = {
  body: Joi.object()
    .keys({
      phoneNumber: phoneNumber.required(),
      otp: otp.required(),
    })
    .required(),
};

const sendOtp = {
  body: Joi.object()
    .keys({
      phoneNumber: phoneNumber.required(),
    })
    .required(),
};

const token = {
  body: Joi.object()
    .keys({
      token: Joi.string().required(),
    })
    .required(),
};

module.exports = {
  register,
  login,
  token,
  sendOtp,
};
