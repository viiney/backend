const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createSubscription = {
  params: Joi.object()
    .keys({
      subscriptionModelId: objectId.required(),
    })
    .required(),
};

const manualPaymentMarking = {
  body: Joi.object()
    .keys({
      orderIds: Joi.array().items(Joi.string().allow('')).required(),
    })
    .required(),
};

const recordPaymentSuccess = {
  body: Joi.object().keys({
    razorPaymentId: Joi.string().required(),
    razorOrderId: Joi.string().required(),
    razorpaySignature: Joi.string().required(),
    subscriptionId: objectId.required(),
  }),
};

const recordPaymentFail = {
  body: Joi.object().keys({
    subscriptionId: objectId.required(),
    errorRespFromRazorPay: Joi.object().keys({
      code: Joi.string().allow(''),
      description: Joi.string().allow(''),
      source: Joi.string().allow(''),
      step: Joi.string().allow(''),
      reason: Joi.string().allow(''),
      metadata: Joi.object()
        .keys({
          payment_id: Joi.string().required(),
          order_id: Joi.string().required(),
        })
        .required(),
    }),
  }),
};

const createSubscriptionModel = {
  body: Joi.object()
    .keys({
      durationInMS: Joi.number().integer().required(),
      description: Joi.string().required(),
      name: Joi.string().required(),
      amount: Joi.number().integer().required(),
      currency: Joi.string()
        .default('INR')
        .valid(...['INR']),
    })
    .required(),
};

module.exports = {
  recordPaymentFail,
  recordPaymentSuccess,
  createSubscription,
  createSubscriptionModel,
  manualPaymentMarking,
};
