const { Types } = require('mongoose');
const crypto = require('crypto');
const httpStatus = require('http-status');
const Razorpay = require('razorpay');
const razorPay = require('../config/razorpay');
const config = require('../config/config');
const { SubscriptionFee, Subscription } = require('../models');
const ApiError = require('../utils/ApiError');
const { paymentStatus, paymentMarkFailThreshold } = require('../config/config');

/**
 * @returns {Promise<Array<Subscription>>>}
 */
const getSubscriptionAvailable = () => {
  return SubscriptionFee.find({ isDeleted: false }).exec();
};

/**
 * @param {string} subscriptionId
 * @param {string} userId
 *
 * Response
 * {
 *   "id": "order_DBJOWzybf0sJbb",
 *   "entity": "order",
 *   "amount": 50000,
 *   "amount_paid": 0,
 *   "amount_due": 39900,
 *   "currency": "INR",
 *   "receipt": "order_rcptid_11",
 *   "status": "created",
 *   "attempts": 0,
 *   "notes": [],
 *   "created_at": 1566986570
 * }
 * @returns {Promise<{orderId: string, subscriptionModel: Object, subscriptionId: string}>}
 */
const createOrGetOrderForSubscription = async (subscriptionModelId, userId) => {
  await SubscriptionFee.valid(subscriptionModelId);
  const subscriptionModel = await SubscriptionFee.findOne({
    _id: Types.ObjectId(subscriptionModelId),
    isDeleted: false,
  }).exec();

  const subscriptionInDB = await Subscription.findOne({
    productId: Types.ObjectId(subscriptionModelId),
    userId: Types.ObjectId(userId),
    status: paymentStatus.CREATED,
  }).exec();

  if (!subscriptionInDB) {
    const orderResponse = await razorPay.orders.create({
      amount: subscriptionModel.amount,
      currency: subscriptionModel.currency,
    });
    const subscription = await Subscription.create({
      userId,
      orderDetailFromRazorPay: orderResponse,
      productId: subscriptionModel._id,
    });
    return {
      orderId: orderResponse.id,
      subscriptionModel,
      subscriptionId: subscription._id,
    };
  }
  return {
    orderId: subscriptionInDB.orderDetailFromRazorPay.id,
    subscriptionModel,
    subscriptionId: subscriptionInDB._id,
  };
};

/**
 * @param {string} razorPaymentId
 * @param {string} razorOrderId
 * @param {string} razorpaySignature
 * @param {string} subscriptionId
 * @param {string} userId
 * @returns {Promise<void>}
 */
const recordPaymentSuccess = async (razorPaymentId, razorOrderId, razorpaySignature, subscriptionId, userId) => {
  // Check to see if payment made was of same amount as subscriptionModel
  await Subscription.valid(subscriptionId, userId);
  const subscription = await Subscription.findOne({ _id: Types.ObjectId(subscriptionId) }).exec();

  if (![paymentStatus.PENDING, paymentStatus.CREATED, paymentStatus.ATTEMPT_FAIL].includes(subscription.status)) {
    throw new ApiError(httpStatus.CONFLICT, `Payment is already in ${subscription.status} state`);
  }
  const body = `${razorOrderId}|${razorPaymentId}`;
  const generatedSign = crypto.createHmac('sha256', config.razorPay.keySecret).update(body.toString()).digest('hex');

  if (razorpaySignature === generatedSign) {
    const subscriptionModel = await SubscriptionFee.findOne({
      _id: Types.ObjectId(subscription.productId),
      isDeleted: false,
    }).exec();

    const alreadySubscriptionTill = await Subscription.findSubscriptionValidTill(subscription.userId);
    const paymentDetailFromRazorPay = await razorPay.payments.fetch(razorPaymentId);
    let status = paymentStatus.FAILED;
    if (
      paymentDetailFromRazorPay.status === 'captured' ||
      paymentDetailFromRazorPay.status === 'authorized' ||
      paymentDetailFromRazorPay.status === 'created'
    ) {
      status = paymentStatus.SUCCESS;
    }
    const response = await Subscription.updateOne(
      { _id: Types.ObjectId(subscriptionId) },
      {
        status,
        $push: { paymentDetailFromRazorPay },
        signature: razorpaySignature,
        subscriptionDetail: {
          startDate: alreadySubscriptionTill || Date.now(),
          duration: subscriptionModel.duration,
        },
      }
    );
    if (response.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Payment success not recorded.');
    }
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Payment Signature.');
  }
};

const subscriptionSuccessMarkedManuallyByOrderId = async (orderIds) => {
  const subscriptions = await Subscription.find({
    'orderDetailFromRazorPay.id': { $in: orderIds },
    status: { $in: [paymentStatus.ATTEMPT_FAIL, paymentStatus.CREATED] },
  }).exec();
  const promises = subscriptions.map(async (subscription) => {
    const subscriptionModel = await SubscriptionFee.findOne({
      _id: Types.ObjectId(subscription.productId),
      isDeleted: false,
    }).exec();
    const alreadySubscriptionTill = await Subscription.findSubscriptionValidTill(subscription.userId);
    const response = await Subscription.updateOne(
      { _id: subscription._id },
      {
        status: paymentStatus.SUCCESS,
        // signature: razorpaySignature,
        subscriptionDetail: {
          startDate: alreadySubscriptionTill || Date.now(),
          duration: subscriptionModel.duration,
        },
      }
    );
    if (response.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Payment success not recorded.');
    }
  });

  return Promise.all(promises);
};
/**
 * @param {string} paymentId
 * @param {string} userId
 * @param errorRespFromRazorPay
 * @param {string} errorRespFromRazorPay.code
 * @param {string} errorRespFromRazorPay.description
 * @param {string} errorRespFromRazorPay.source
 * @param {string} errorRespFromRazorPay.step
 * @param {string} errorRespFromRazorPay.reason
 * @param {Object} errorRespFromRazorPay.metadata
 * @param {string} errorRespFromRazorPay.metadata.payment_id
 * @param {string} errorRespFromRazorPay.metadata.order_id
 */

const recordFailPaymentAttempt = async (paymentId, userId, errorRespFromRazorPay) => {
  await Subscription.valid(paymentId, userId);
  const payment = await Subscription.findOne({ _id: Types.ObjectId(paymentId) }).exec();
  if (![paymentStatus.PENDING, paymentStatus.CREATED, paymentStatus.ATTEMPT_FAIL].includes(payment.status)) {
    throw new ApiError(httpStatus.CONFLICT, `Payment is already in ${payment.status} state`);
  }
  const paymentDetailFromRazorPay = await razorPay.payments.fetch(errorRespFromRazorPay.metadata.payment_id);
  paymentDetailFromRazorPay.errorResponse = errorRespFromRazorPay;
  await Subscription.updateOne(
    { _id: Types.ObjectId(paymentId) },
    {
      status: paymentStatus.ATTEMPT_FAIL,
      $push: { paymentDetailFromRazorPay },
    }
  );
};

const makeOldInCompleteSubscriptionFail = async () => {
  const totalFailed = await Subscription.find({
    isDeleted: false,
    status: {
      $in: [paymentStatus.CREATED, paymentStatus.ATTEMPT_FAIL],
      createdAt: { $lt: Date.now() - paymentMarkFailThreshold },
    },
  })
    .count()
    .exec();
  const response = await Subscription.updateMany(
    {
      isDeleted: false,
      status: {
        $in: [paymentStatus.PENDING, paymentStatus.ATTEMPT_FAIL],
        createdAt: { $lt: Date.now() - paymentMarkFailThreshold },
      },
    },
    { status: paymentStatus.FAILED }
  ).exec();
  if (response.nModified < totalFailed) {
    throw new ApiError(
      httpStatus.NOT_MODIFIED,
      `Total marked failed = ${response.nModified} out of total ${totalFailed} while marking all old orders as failed.`
    );
  }
};

const checkAndProcessCreatedOrAttemptFailedPayment = async () => {
  const instance = new Razorpay({
    key_id: config.razorPay.keyId,
    key_secret: config.razorPay.keySecret,
  });
  const filter = {
    status: {
      $in: [paymentStatus.CREATED, paymentStatus.ATTEMPT_FAIL],
    },
    createdAt: { $lte: new Date(Date.now() - paymentMarkFailThreshold) },
  };
  const unsuccessfulPayments = await Subscription.find(filter).exec();
  const totalFailed = unsuccessfulPayments.length;
  const response = unsuccessfulPayments.map(async (subscription) => {
    const razorPayOrderId = subscription.orderDetailFromRazorPay.id;
    instance.orders.fetchPayments(razorPayOrderId, console.log);
  });
  // await Promise.all(response).catch(console.error);
  // const response = await Subscription.updateMany(filter, { status: paymentStatus.FAILED }).exec();
  // if (response.nModified < totalFailed) {
  //   throw new ApiError(
  //     httpStatus.NOT_MODIFIED,
  //     `Total marked failed = ${response.nModified} out of total ${totalFailed} while marking all old orders as failed.`
  //   );
  // }
};
const createSubscriptionModel = async (durationInMS, description, name, amount, currency = 'INR') => {
  await SubscriptionFee.create({
    duration: durationInMS,
    description,
    name,
    amount,
    currency,
  });
};

module.exports = {
  recordFailPaymentAttempt,
  recordPaymentSuccess,
  getSubscriptionAvailable,
  createOrGetOrderForSubscription,
  makeOldInCompleteSubscriptionFail,
  createSubscriptionModel,
  checkAndProcessCreatedOrAttemptFailedPayment,
  subscriptionSuccessMarkedManuallyByOrderId,
};

// check payment is already made or not
// add a cron to check if payment is not success over 2 hours.
// if payment is in ATTEMPT FAIL, PENDING, CREATED state move them to FAILED state.
// before that for PENDING check if the payment was captured and successful
