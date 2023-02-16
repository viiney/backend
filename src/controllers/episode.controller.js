const httpStatus = require('http-status');
const { pick } = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { seriesService } = require('../services');

const getEpisodesForSeries = catchAsync(async (req, res) => {
  const episodes = await seriesService.getAllEpisodeForSeries(req.params.seriesId, req.query.forced);
  res.status(httpStatus.OK).send({ data: episodes });
});
const getAllEpisodes = catchAsync(async (req, res) => {
  const episodes = await seriesService.getAllEpisode();
  res.status(httpStatus.OK).send({ data: episodes });
});

const createEpisodeForSeries = catchAsync(async (req, res) => {
  const body = pick(req.body, ['name', 'description', 'order', 'isFree']);
  const files = pick(req.files, ['audio']);
  const { seriesId } = req.params;
  await seriesService.createEpisodeForSeries(seriesId, body, files.audio[0]);
  return res.status(httpStatus.CREATED).send();
});

const updateEpisodeForSeries = catchAsync(async (req, res) => {
  const body = pick(req.body, ['name', 'description', 'isFree', 'order']);
  const audioBuffer = req.file;
  const { episodeId, seriesId } = req.params;
  await seriesService.updateEpisode(seriesId, episodeId, body, audioBuffer);
  res.status(httpStatus.ACCEPTED).send();
});

const deleteEpisodeForSeries = catchAsync(async (req, res) => {
  await seriesService.softDeleteEpisodeForSeries(req.params.episodeId);
  res.status(httpStatus.ACCEPTED).send();
});

const getRecording = catchAsync(async (req, res) => {
  // Role can be undefined
  const role = req.user && req.user.role;
  const userId = req.user && req.user._id;
  const audioUri = await seriesService.getAudioForEpisode(req.params.episodeId, role, userId);
  res.status(httpStatus.OK).send({ data: { audioUri } });
});

const getEpisode = catchAsync(async (req, res) => {
  const { episodeId } = req.params;
  const episode = await seriesService.getEpisode(episodeId);
  res.status(httpStatus.OK).send({ data: episode });
});

module.exports = {
  getEpisodesForSeries,
  createEpisodeForSeries,
  updateEpisodeForSeries,
  deleteEpisodeForSeries,
  getRecording,
  getEpisode,
  getAllEpisodes,
};
