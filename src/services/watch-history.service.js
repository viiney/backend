const { Types } = require('mongoose');
const httpStatus = require('http-status');
const Model = require('../models');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const { Episode, Series, FileUpload, User } = require('../models');
const { capitalizeFirstLetterOfEachWord } = require('../utils/pick');

/**
 * @param {string} userId
 * @param {string} episodeId
 * @param {number} playedAt
 * @param {number} playedTime
 * @returns {Promise<void>}
 */
const createOrUpdateHistory = async (userId, episodeId, playedAt, playedTime) => {
  const alreadyExists = await Model.WatchHistory.alreadyExist(episodeId, userId);
  if (alreadyExists) {
    const response = await Model.WatchHistory.updateOne(
      {
        userId: Types.ObjectId(userId),
        episodeId: Types.ObjectId(episodeId),
        isDeleted: false,
      },
      {
        $push: {
          playHistory: [
            {
              playedAt,
              playedTill: playedTime,
              createdAt: Date.now(),
            },
          ],
        },
      }
    ).exec();
    if (response.nModified === 0) {
      throw new ApiError(
        httpStatus.NOT_MODIFIED,
        `Not able to update history for userId ${userId} and episodeId ${episodeId}`
      );
    }
  } else {
    await Model.Episode.valid(episodeId);
    const historyDoc = {
      userId,
      episodeId,
      playHistory: [
        {
          playedAt,
          playedTill: playedTime,
          createdAt: Date.now(),
        },
      ],
      historyType: config.historyType.Episode,
    };
    await Model.WatchHistory.create(historyDoc);
  }

  const response = await User.updateOne({ _id: Types.ObjectId(userId) }, { lastPlayedAnyEpisodeAt: Date.now() }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, 'Not able to mark users as online.');
  }
};

/**
 * @param {string} userId
 * @returns {Promise<*>}
 */
const getAllHistory = async (userId) => {
  const history = await Model.WatchHistory.aggregate([
    {
      $match: {
        isDeleted: false,
        userId,
      },
    },
    {
      $project: {
        episodeId: 1,
        _id: 1,
        playHistory: {
          createdAt: 1,
          playedAt: 1,
          playedTill: 1,
        },
        historyType: 1,
        createdAt: 1,
      },
    },
    {
      $lookup: {
        from: Episode.collectionName,
        localField: 'episodeId',
        foreignField: '_id',
        as: 'episode',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              images: 1,
              isFree: 1,
              createdAt: 1,
              seriesId: 1,
              audio: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: '$episode' },
    },
    {
      $lookup: {
        from: Series.collectionName,
        localField: 'episode.seriesId',
        foreignField: '_id',
        as: 'series',
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              author: 1,
              images: 1,
              isFree: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: { path: '$series' },
    },
    {
      $lookup: {
        from: FileUpload.collectionName,
        localField: 'episode.images',
        foreignField: '_id',
        as: 'episode.images',
      },
    },
    {
      $lookup: {
        from: FileUpload.collectionName,
        localField: 'episode.audio',
        foreignField: '_id',
        as: 'episode.audio',
      },
    },
    {
      $unwind: { path: '$episode.audio' },
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
      $lookup: {
        from: Episode.collectionName,
        localField: 'series._id',
        foreignField: 'seriesId',
        as: 'series.totalEpisode',
        pipeline: [
          {
            $count: 'count',
          },
        ],
      },
    },
    {
      $unwind: { path: '$series.totalEpisode' },
    },
    {
      $addFields: {
        'series.totalEpisode': '$series.totalEpisode.count',
      },
    },
    {
      $project: {
        episodeId: 0,
        'episode.seriesId': 0,
      },
    },
  ]);
  const historySeriesGroupMapped = history
    .map((h) => {
      return {
        ...h,
        series: {
          ...h.series,
          name: capitalizeFirstLetterOfEachWord(h.series.name),
          description: capitalizeFirstLetterOfEachWord(h.series.description),
          images: h.series.images.map(FileUpload.s3Url),
        },
        episode: {
          ...h.episode,
          name: capitalizeFirstLetterOfEachWord(h.episode.name),
          audio: FileUpload.s3Url(h.episode.audio),
          images: h.episode.images.map(FileUpload.s3Url),
        },
      };
    })
    .reduce((acc, prev) => {
      const { series, episode, ...restDetails } = prev;
      if (!acc[series._id]) {
        acc[series._id] = {
          series,
          playedEpisodeDetail: [],
        };
      }
      acc[series._id].playedEpisodeDetail.push({
        ...restDetails,
        episode,
      });
      return acc;
    }, {});

  return Object.values(historySeriesGroupMapped);
};

/**
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteAllHistory = async (userId) => {
  const response = await Model.WatchHistory.updateMany({ userId }, { isDeleted: true }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, `Not able to clear history for ${userId}`);
  }
};
/**
 * @param {string} userId
 * @param {string} historyId
 * @returns {Promise<void>}
 */
const deleteHistory = async (userId, historyId) => {
  await Model.WatchHistory.valid(historyId);
  const response = await Model.WatchHistory.updateOne({ userId, _id: historyId }, { isDeleted: true }).exec();
  if (response.nModified === 0) {
    throw new ApiError(httpStatus.NOT_MODIFIED, `Not able to clear history for ${userId}`);
  }
};

/**
 * @param {string} userId
 * @returns {Promise<{totalTimeInMS: number, totalWatched: number}>}
 */
const getTotalTimeAndAudioWatched = async (userId) => {
  const history = await Model.WatchHistory.find({ userId: Types.ObjectId(userId), isDeleted: false })
    .populate('episodeId')
    .exec();
  const totalPlayedTime = history.reduce((acc, prev) => {
    const totalTimeForCurr = prev.playHistory.reduce((accPH, prevPH) => {
      return accPH + prevPH.playedTill;
    }, acc);
    return totalTimeForCurr;
  }, 0);

  const totalSeries = new Set(history.map((h) => h.episodeId.seriesId));
  return {
    totalTimeInMS: totalPlayedTime,
    totalWatched: totalSeries.size,
  };
};

module.exports = {
  createOrUpdateHistory,
  getAllHistory,
  deleteHistory,
  getTotalTimeAndAudioWatched,
  deleteAllHistory,
};
