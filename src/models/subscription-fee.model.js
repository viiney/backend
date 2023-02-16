const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { Types } = require('mongoose');
const ApiError = require('../utils/ApiError');

const subscriptionFee = new mongoose.Schema(
  {
    duration: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ['INR'],
      required: false,
      default: 'INR',
    },
    metaInfo: {
      type: Object,
      required: false,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
subscriptionFee.statics.valid = async function (productId) {
  const category = await this.findOne({ _id: Types.ObjectId(productId), isDeleted: false }).exec();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, `Product with productId - ${productId} not found`);
  }
};
/**
 * @typedef SubscriptionFee
 */
const SubscriptionFee = mongoose.model('SubscriptionFee', subscriptionFee);
SubscriptionFee.collectionName = 'subscriptionfees';
module.exports = SubscriptionFee;
