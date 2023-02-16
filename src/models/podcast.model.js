const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const {PodcastCategory, FileUpload} = require("./index");

const guestSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  accessPass: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});
const eventSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    roomId: {
      type: String,
      required: true,
    },
    guest: {
      type: guestSchema,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const podcastSchema = mongoose.Schema(
  {
    eventDetail: {
      type: eventSchema,
      required: true,
    },
    recordingDetail: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: FileUpload.modelName,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: PodcastCategory.modelName,
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
podcastSchema.plugin(toJSON);
podcastSchema.plugin(paginate);

/**
 * @typedef Podcast
 */
const Podcast = mongoose.model('Podcast', podcastSchema);

module.exports = Podcast;
