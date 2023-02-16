const express = require('express');
const auth = require('../../middlewares/auth');
const { subscriptionController } = require('../../controllers');
const validate = require('../../middlewares/validate');
const { subscriptionValidation } = require('../../validations');
const { rights } = require('../../config/roles');

const router = express.Router();

router.post(
  '/create/:subscriptionModelId',
  auth(),
  validate(subscriptionValidation.createSubscription),
  subscriptionController.createSubscription
);
router.post(
  '/payment/success',
  auth(),
  validate(subscriptionValidation.recordPaymentSuccess),
  subscriptionController.recordPaymentSuccess
);
router.post(
  '/payment/fail',
  auth(),
  validate(subscriptionValidation.recordPaymentFail),
  subscriptionController.recordPaymentFailedAttempt
);
router.get('/models', auth(), subscriptionController.getAllSubscriptionModel);
router.post(
  '/model',
  auth(rights.SUBSCRIPTION_MODEL_MANAGE),
  validate(subscriptionValidation.createSubscriptionModel),
  subscriptionController.createSubscriptionModel
);
// router.post(
//   '/processPending',
//   auth(rights.SUBSCRIPTION_MODEL_MANAGE),
//   subscriptionController.checkAndProcessCreatedOrAttemptFailedPayment
// );

router.post(
  '/manualPaymentMarking',
  auth(rights.SUBSCRIPTION_MODEL_MANAGE),
  validate(subscriptionValidation.manualPaymentMarking),
  subscriptionController.subscriptionSuccessMarkedManuallyByOrderId,
);
module.exports = router;
