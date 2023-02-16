const httpStatus = require('http-status');
const { subscriptionService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { pick } = require('../utils/pick');

const getAllSubscriptionModel = catchAsync(async (req, res) => {
  const subscriptionModels = await subscriptionService.getSubscriptionAvailable();
  res.status(httpStatus.OK).send({ data: subscriptionModels });
});

const createSubscription = catchAsync(async (req, res) => {
  const { subscriptionModelId } = req.params;
  const userId = req.user._id;
  const subscriptionDetail = await subscriptionService.createOrGetOrderForSubscription(subscriptionModelId, userId);
  res.status(httpStatus.CREATED).send({ data: subscriptionDetail });
});

const recordPaymentSuccess = catchAsync(async (req, res) => {
  const { razorPaymentId, razorOrderId, razorpaySignature, subscriptionId } = pick(req.body, [
    'razorPaymentId',
    'razorOrderId',
    'razorpaySignature',
    'subscriptionId',
  ]);
  const userId = req.user._id;
  await subscriptionService.recordPaymentSuccess(razorPaymentId, razorOrderId, razorpaySignature, subscriptionId, userId);
  res.status(httpStatus.ACCEPTED).send();
});

const recordPaymentFailedAttempt = catchAsync(async (req, res) => {
  const { subscriptionId, errorRespFromRazorPay } = pick(req.body, ['errorRespFromRazorPay', 'subscriptionId']);
  const userId = req.user._id;
  await subscriptionService.recordFailPaymentAttempt(subscriptionId, userId, errorRespFromRazorPay);
  res.status(httpStatus.ACCEPTED).send();
});

const createSubscriptionModel = catchAsync(async (req, res) => {
  const {
    durationInMS,
    description,
    name,
    amount,
    currency = 'INR',
  } = pick(req.body, ['durationInMS', 'description', 'name', 'amount', 'currency']);
  await subscriptionService.createSubscriptionModel(durationInMS, description, name, amount, currency);
  res.status(httpStatus.CREATED).send();
});

const checkAndProcessCreatedOrAttemptFailedPayment = catchAsync(async (req, res) => {
  await subscriptionService.checkAndProcessCreatedOrAttemptFailedPayment();
  res.status(httpStatus.OK).send();
});
const subscriptionSuccessMarkedManuallyByOrderId = catchAsync(async (req, res) => {
  const { orderIds } = req.body;
  await subscriptionService.subscriptionSuccessMarkedManuallyByOrderId(orderIds);
  res.status(httpStatus.OK).send();
});

module.exports = {
  recordPaymentFailedAttempt,
  recordPaymentSuccess,
  createSubscription,
  getAllSubscriptionModel,
  createSubscriptionModel,
  checkAndProcessCreatedOrAttemptFailedPayment,
  subscriptionSuccessMarkedManuallyByOrderId,
};
