const mongoose = require('mongoose');
const { Types } = require('mongoose');
const httpStatus = require('http-status');
const { User, SubscriptionFee } = require('.');
const { paymentStatus, thresholdForLivePaidUsers } = require('../config/config');
const ApiError = require('../utils/ApiError');

const subscriptionDetail = mongoose.Schema({
  startDate: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
});

const subscriptionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: User.modelName,
    },
    paymentDetailFromRazorPay: {
      type: [Object],
      required: false,
      default: [],
    },
    orderDetailFromRazorPay: {
      type: Object,
      required: false,
      default: {},
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: SubscriptionFee.modelName,
    },
    status: {
      type: String,
      enum: Object.values(paymentStatus),
      required: false,
      default: paymentStatus.CREATED,
    },
    signature: {
      type: String,
      required: false,
    },
    subscriptionDetail: {
      type: subscriptionDetail,
      required: false,
    },
    metaInfo: {
      type: Object,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * @param {string} subscriptionId
 * @param {string} userId
 * @returns {Promise<void>}
 */
subscriptionSchema.statics.valid = async function (subscriptionId, userId) {
  const payment = await this.findOne({
    _id: Types.ObjectId(subscriptionId),
    userId,
    status: { $nin: [paymentStatus.FAILED, paymentStatus.SUCCESS] },
  }).exec();
  if (!payment) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `Subscription with subscription - ${subscriptionId} not found for the user try create new subscripton.`
    );
  }
};

const calculateSubscriptionValidity = (subscriptionList) => {
  return subscriptionList.reduce((date, elem) => {
    const startDate =
      (elem.subscriptionDetail && elem.subscriptionDetail.startDate && elem.subscriptionDetail.startDate.getTime()) || 0;
    const duration = (elem.subscriptionDetail && elem.subscriptionDetail.duration) || 0;
    const validTill = startDate + duration;
    if (validTill > date) {
      return validTill;
    }
    return date;
  }, 0);
};

/**
 * @param {string} userId
 * @returns {Promise<number>}
 */
subscriptionSchema.statics.findSubscriptionValidTill = async function (userId) {
  const previousPayments = this.find({
    userId,
    status: paymentStatus.SUCCESS,
  }).exec();

  return previousPayments.then(calculateSubscriptionValidity);
};

/**
 * @returns {Promise<number>}
 */
subscriptionSchema.statics.countUsersWithSubscription = async function () {
  const allSuccessfulSubscriptionPromise = this.find({
    status: paymentStatus.SUCCESS,
  }).exec();
  /* eslint-disable no-param-reassign */
  return allSuccessfulSubscriptionPromise
    .then((allSuccessfulSubscriptions) => {
      return allSuccessfulSubscriptions.reduce((subscriptionMap, subscription) => {
        const userId = subscription.userId.toString();
        if (!subscriptionMap[userId]) {
          subscriptionMap[userId] = [];
        }
        subscriptionMap[userId].push(subscription);
        return subscriptionMap;
      }, {});
    })
    .then((userIdMapSubscriptions) => {
      return Object.keys(userIdMapSubscriptions)
        .map((userId) => {
          const validTill = calculateSubscriptionValidity(userIdMapSubscriptions[userId]);
          return Date.now() <= validTill - thresholdForLivePaidUsers;
        })
        .filter((e) => e).length;
    });
};

/**
 * @typedef Subscription
 */
const collectionName = 'subscriptions';
const Subscription = mongoose.model('Subscription', subscriptionSchema, collectionName);
Subscription.collectionName = collectionName;

module.exports = Subscription;
