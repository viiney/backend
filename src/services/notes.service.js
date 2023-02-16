const httpStatus = require('http-status');
const { Types } = require('mongoose');
const { Note, Episode, Series, FileUpload, User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 *
 * @param {string} userId
 * @returns {Promise<Note>}
 */
const getAllSeriesNotes = async (userId) => {
  const notes = await Note.aggregate([
    {
      $match: {
        $and: [
          {
            userId: Types.ObjectId(userId),
          },
          {
            seriesId: {
              $ne: null,
            },
          },
          { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        ],
      },
    },
    {
      $project: { _id: 1, seriesId: 1, note: 1, userId: 1, createdAt: 1 },
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
    { $project: { seriesId: 0, userId: 0} },
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
  ]).exec();
  return notes.map((note) => {
    // eslint-disable-next-line no-param-reassign
    note.series.images = note.series.images.map((image) => FileUpload.s3Url(image));
    return note;
  });
};

/**
 * @param {string} userId
 * @param {string} seriesId
 * @returns {Promise<Note>}
 */
const getSeriesNote = async (userId, seriesId) => {
  await Note.valid(userId, seriesId);
  return Note.getNoteIfExist(userId, seriesId);
};

/**
 * @param {string} userId
 * @param {string} note
 * @param {string} seriesId
 * @returns {Promise<void>}
 */
const createOrUpdateNoteForSeries = async (userId, note, seriesId) => {
  const isAlreadyExist = await Note.isAlreadyExist(userId, seriesId);
  if (isAlreadyExist) {
    const response = await Note.updateOne({ $and: [{ seriesId }, { userId }, { isDeleted: false }] }, { note }).exec();
    if (response.nModified === 0) {
      throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to update.');
    }
  } else {
    await Note.create({
      userId,
      seriesId,
      note,
    });
  }
};

const deleteNote = async (userId, noteId) => {
  await Note.validUserForNote(userId, noteId);
  const response = await Note.updateOne({ _id: Types.ObjectId(noteId) }, { isDeleted: true }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to delete series');
  }
  return true;
};

module.exports = {
  getSeriesNote,
  createOrUpdateNoteForSeries,
  getAllSeriesNotes,
  deleteNote,
};
