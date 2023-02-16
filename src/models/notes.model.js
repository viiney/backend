const mongoose = require('mongoose');
const validator = require('validator');
const { Types } = require('mongoose');
const httpStatus = require('http-status');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');
const { Series, User, FileUpload } = require('./index');
const ApiError = require('../utils/ApiError');

const notesSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: Series.modelName,
    },
    podcastId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: Series.modelName,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: Series.modelName,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * @param {string} userId
 * @param {string} objId - SeriesId or PodcastId
 * @param isPodcast - if false objId is taken as seriesId else podcastId
 */
notesSchema.statics.valid = async function (userId, objId, isPodcast = false) {
  const id = Types.ObjectId(objId);
  const o = isPodcast ? { podcastId: id } : { seriesId: id };
  const note = await this.findOne({
    $and: [
      {
        userId: Types.ObjectId(userId),
      },
      o,
      {
        $or: [{ isDeleted: false }, { isDeleted: undefined }],
      },
    ],
  }).exec();
  if (!note) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No notes available');
  }
};

/**
 * @param {string} userId
 * @param {string} objId - SeriesId or PodcastId
 * @param isPodcast - if false objId is taken as seriesId else podcastId
 * @return {Promise<boolean>}
 */
notesSchema.statics.isAlreadyExist = async function (userId, objId, isPodcast = false) {
  const id = Types.ObjectId(objId);
  const o = isPodcast ? { podcastId: id } : { seriesId: id };
  const note = await this.findOne({
    $and: [
      {
        userId: Types.ObjectId(userId),
      },
      o,
      {
        $or: [{ isDeleted: false }, { isDeleted: undefined }],
      },
    ],
  }).exec();
  return !!note;
};

/**
 * @param {string} userId
 * @param {string} objId - SeriesId or PodcastId
 * @param isPodcast - if false objId is taken as seriesId else podcastId
 * @returns {Promise<Note>}
 */
notesSchema.statics.getNoteIfExist = async function (userId, objId, isPodcast = false) {
  const id = Types.ObjectId(objId);
  const o = isPodcast ? { podcastId: id } : { seriesId: id };
  const note = await this.aggregate([
    {
      $match: {
        $and: [
          {
            userId: Types.ObjectId(userId),
          },
          o,
          {
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          },
        ],
      },
    },
    {
      $project: {
        note: 1,
        seriesId: 1,
        _id: 1,
        createdAt: 1,
      },
    },
    {
      $lookup: {
        from: Series.collectionName,
        localField: 'seriesId',
        foreignField: '_id',
        as: 'series',
        pipeline: [
          {
            $project: {
              images: 1,
              name: 1,
              description: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    { $project: { seriesId: 0, userId: 0 } },
    {
      $unwind: '$series',
    },
    {
      $lookup: {
        from: FileUpload.collectionName,
        localField: 'series.images',
        foreignField: '_id',
        as: 'series.images',
      },
    },
    {
      $limit: 1,
    },
  ]).exec();
  note[0].series.images = note[0].series.images.map((image) => FileUpload.s3Url(image));
  return note[0];
};

/**
 * @param {string} userId
 * @param {string} noteId
 * @returns {Promise<Note>}
 */
notesSchema.statics.validUserForNote = async function (userId, noteId) {
  const note = await this.findOne({
    $and: [
      {
        _id: Types.ObjectId(noteId),
      },
      {
        $or: [{ isDeleted: false }, { isDeleted: undefined }],
      },
    ],
  }).exec();
  if (!note) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Note is not found');
  } else if (note.userId.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, "You don't have the access for the notes");
  }
  return note;
};

/**
 * @typedef Note
 */
const Note = mongoose.model('Note', notesSchema);

module.exports = Note;
