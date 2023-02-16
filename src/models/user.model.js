const mongoose = require('mongoose');
const validator = require('validator');
const httpStatus = require('http-status');
const { toJSON, paginate } = require('./plugins');
const { roles, roleEnum } = require('../config/roles');
const { FileUpload } = require('./index');
const ApiError = require('../utils/ApiError');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      validate(value) {
        if (!validator.default.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      validate(value) {
        if (!validator.default.isMobilePhone(value, 'en-IN')) {
          throw new Error('Invalid phoneNumber');
        }
      },
    },
    role: {
      type: String,
      enum: roles,
      default: roleEnum.user,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: FileUpload.modelName,
    },
    description: {
      type: String,
      required: false,
      default: '',
    },
    referralCode: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    lastPlayedAnyEpisodeAt: {
      type: Date,
      required: false,
      default: null,
    },
    dob: {
      type: Number,
      required: false,
      default: null,
    },
    state: {
      type: String,
      required: false,
      default: '',
    },
    city: {
      type: String,
      required: false,
      default: '',
    },
    qualification: {
      type: String,
      required: false,
      default: '',
    },
    occupation: {
      type: String,
      required: false,
      default: '',
    },
    preparingFor: {
      type: String,
      required: false,
      default: '',
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
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 *
 * @param {string} phoneNumber
 * @param {string} excludeUserId
 * @returns
 */
userSchema.statics.isPhoneNumberTaken = async function (phoneNumber, excludeUserId) {
  const user = await this.findOne({ phoneNumber, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 *
 * @param {string} userId
 */
userSchema.statics.valid = async function (userId) {
  const user = await this.findOne({ _id: mongoose.Types.ObjectId(userId), isDeleted: false }).exec();
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found or blacklisted');
  }
};

/**
 *
 * @param {string} userId
 */
userSchema.statics.canProvideAdminAccess = async function (userId) {
  // TODO: should we also include admin?
  const user = await this.findOne({ _id: mongoose.Types.ObjectId(userId), isDeleted: false, role: roleEnum.user }).exec();
  if (!user) {
    throw new ApiError(httpStatus.CONFLICT, 'User is already admin.');
  }
};

/**
 * @typedef User
 * @property {string} name
 */
const collectionName = 'users';
const User = mongoose.model('User', userSchema, collectionName);
User.collectionName = collectionName;
module.exports = User;
