const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { User } = require('./index');

const referralSchema = new mongoose.Schema(
  {
    referralCodeFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User.modelName,
      required: true,
    },
    referralCodeFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User.modelName,
      required: true,
    },
    metaInfo: {
      type: Object,
      required: false,
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

// add plugin that converts mongoose to json
referralSchema.plugin(toJSON);
referralSchema.plugin(paginate);

/**
 * @typedef Referral
 * @property {string} referralCodeFrom
 * @property {string} referralCodeFor
 * @property {Object} metaInfo
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */
const collectionName = 'referrals';
const Referral = mongoose.model('Referral', referralSchema, collectionName);
Referral.collectionName = collectionName;
module.exports = Referral;
