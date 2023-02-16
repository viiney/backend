const Joi = require('joi');

const contactUs = {
  body: Joi.object()
    .keys({
      from: Joi.string().email().required(),
      subject: Joi.string().required(),
      text: Joi.string().required(),
    })
    .required(),
};

module.export = {
  contactUs,
};
