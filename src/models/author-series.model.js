const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const { Series, Author } = require('./index');
const { Types } = require('mongoose')

const authorSeriesSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: Series.modelName,
      unique: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: Author.modelName,
    },
    isPromoted: {
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

authorSeriesSchema.plugin(toJSON);

authorSeriesSchema.statics.isAlreadyLinked = async function (seriesId) {
  const response = await this.findOne({ series: Types.ObjectId(seriesId) }).exec();
  return !!response;
};
/**
 * @typedef AuthorSeries
 */
const collectionName = 'authorseries';
const AuthorSeries = mongoose.model('AuthorSeries', authorSeriesSchema, collectionName);
AuthorSeries.collectionName = collectionName;
module.exports = AuthorSeries;
