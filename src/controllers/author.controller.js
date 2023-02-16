const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authorService } = require('../services');
const { authorSeriesStatus } = require('../config/config');

const createAuthor = catchAsync(async (req, res) => {
  const { name } = req.body;
  const imageBuffer = req.file;
  await authorService.createAuthor(name, imageBuffer);
  res.status(httpStatus.CREATED).send();
});

const getAuthors = catchAsync(async (req, res) => {
  const authors = await authorService.getAllAuthor();
  res.status(httpStatus.OK).send({ data: authors });
});

const deleteAuthor = catchAsync(async (req, res) => {
  const { authorId } = req.params;
  await authorService.deleteAuthor(authorId);
  res.status(httpStatus.ACCEPTED).send();
});

const updateAuthor = catchAsync(async (req, res) => {
  const { name } = req.body;
  const { authorId } = req.params;
  const imageBuffer = req.file;
  await authorService.updateAuthor(authorId, name, imageBuffer);
  res.status(httpStatus.ACCEPTED).send();
});

const getAllSeriesWithoutAuthor = catchAsync(async (req, res) => {
  const response = await authorService.getAllSeriesWithoutAuthor();
  res.status(httpStatus.OK).send({ data: response });
});

const getSeriesWithAuthors = catchAsync(async (req, res) => {
  const status = req.query.status || authorSeriesStatus.ALL;
  const response = await authorService.getSeriesWithAuthors(status, req.query.forced);
  res.status(httpStatus.OK).send({ data: response });
});

const getSeriesForAuthor = catchAsync(async (req, res) => {
  const { authorId } = req.params;
  const response = await authorService.getSeriesForAuthor(authorId);
  res.status(httpStatus.OK).send({ data: response });
});

const linkAuthorToNewSeries = catchAsync(async (req, res) => {
  const { authorId, seriesId } = req.body;
  await authorService.linkSeriesToNewAuthor(seriesId, authorId);
  res.status(httpStatus.ACCEPTED).send();
});

const linkAuthorToSeries = catchAsync(async (req, res) => {
  const { authorId, seriesId } = req.body;
  await authorService.linkSeriesToAuthor(seriesId, authorId);
  res.status(httpStatus.ACCEPTED).send();
});

const deLinkSeries = catchAsync(async (req, res) => {
  const { authorId, seriesId } = req.body;
  await authorService.deLinkSeries(seriesId, authorId);
  res.status(httpStatus.ACCEPTED).send();
});

const promoteOrDemoteSeries = catchAsync(async (req, res) => {
  const { isPromoted, seriesId } = req.body;
  await authorService.promoteOrDemoteSeries(seriesId, isPromoted);
  res.status(httpStatus.ACCEPTED).send();
});

module.exports = {
  createAuthor,
  getAuthors,
  updateAuthor,
  deleteAuthor,
  getAllSeriesWithoutAuthor,
  getSeriesWithAuthors,
  getSeriesForAuthor,
  linkAuthorToNewSeries,
  linkAuthorToSeries,
  deLinkSeries,
  promoteOrDemoteSeries,
};
