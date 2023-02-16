const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { pick } = require('../utils/pick');
const { watchHistoryService } = require('../services');

const createOrUpdate = catchAsync(async (req, res) => {
  const body = pick(req.body, ['episodeId', 'playedAt', 'playedTime']);
  const userId = req.user._id;
  await watchHistoryService.createOrUpdateHistory(userId, body.episodeId, body.playedAt, body.playedTime);
  res.status(httpStatus.ACCEPTED).send();
});

const getAllHistory = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const response = await watchHistoryService.getAllHistory(userId);
  res.status(httpStatus.OK).send({ data: response });
});

const deleteAllHistory = catchAsync(async (req, res) => {
  const userId = req.user._id;
  await watchHistoryService.deleteAllHistory(userId);
  res.status(httpStatus.ACCEPTED).send();
});

const deleteHistory = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { historyId } = req.params;
  await watchHistoryService.deleteHistory(userId, historyId);
  res.status(httpStatus.ACCEPTED).send();
});

const getTotalTimeAndAudioWatched = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const response = await watchHistoryService.getTotalTimeAndAudioWatched(userId);
  res.status(httpStatus.OK).send({ data: response });
});

module.exports = {
  getAllHistory,
  createOrUpdate,
  deleteAllHistory,
  deleteHistory,
  getTotalTimeAndAudioWatched,
};
