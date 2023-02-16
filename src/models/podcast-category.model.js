const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { toJSON, paginate } = require('./plugins');
const ApiError = require('../utils/ApiError');
const { FileUpload } = require('./index');

const PodCastCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: FileUpload.modelName,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isAllAudioFree: {
      type: Boolean,
      default: false,
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

// add plugin that converts mongoose to json
PodCastCategorySchema.plugin(toJSON);
PodCastCategorySchema.plugin(paginate);


/**
 * @param categoryId
 * @returns {Promise<string>}
 */
PodCastCategorySchema.statics.valid = async function (categoryId) {
  const category = await this.findOne({ _id: categoryId, isDeleted: false }).exec();
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, `Category with categoryId - ${categoryId} not found`);
  }
  return category._id;
};

/**
 * @typedef PodCastCategory
 */
const PodCastCategory = mongoose.model('PodCastCategory', PodCastCategorySchema);

module.exports = PodCastCategory;
