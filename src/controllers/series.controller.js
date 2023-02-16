const httpStatus = require('http-status');
const { pick } = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { seriesService } = require('../services');
const { uploadImageToS3 } = require('../utils/s3Utils');

const getSeries = catchAsync(async (req, res) => {
  const query = pick(req.query, ['limit', 'page', 'categoryId', 'searchTerm', 'forced']);
  const series = await seriesService.getSeries({
    page: query.page,
    limit: query.limit,
    categoryId: query.categoryId,
    searchTerm: query.searchTerm || '',
    forced: query.forced,
  });
  res.status(httpStatus.OK).send({ data: series });
});

const createSeries = catchAsync(async (req, res) => {
  const { name, description, isFree, order } = pick(req.body, [
    'name',
    'description',
    'isFree',
    'order',
  ]);
  const { categoryId } = req.params;
  await seriesService.createSeries({
    name,
    description,
    categoryId,
    isFree,
    order,
    imageBuffers: req.files.images,
    thumbnailImageBuffers: req.files.thumbnailImage,
  });
  res.status(httpStatus.CREATED).send();
});

const updateSeries = catchAsync(async (req, res) => {
  const body = pick(req.body, ['name', 'description', 'isFree', 'categoryId', 'order']);
  const { seriesId } = req.params;

  await seriesService.updateSeries(seriesId, body, req.files.images, req.files.thumbnailImage);
  res.status(httpStatus.ACCEPTED).send();
});

const deleteSeries = catchAsync(async (req, res) => {
  await seriesService.softDeleteSeries(req.params.seriesId);
  res.status(httpStatus.ACCEPTED).send();
});

const getCategories = catchAsync(async (req, res) => {
  const categories = await seriesService.getCategories();
  res.status(httpStatus.OK).send({ data: categories });
});

const createCategories = catchAsync(async (req, res) => {
  const body = pick(req.body, ['name', 'description']);
  await seriesService.createCategory(body.name, body.description, req.file);
  res.status(httpStatus.CREATED).send();
});

const uploadImage = catchAsync(async (req, res) => {
  const image = req.file;
  const imageIds = await uploadImageToS3([image]);
  res.status(httpStatus.CREATED).send({ imageIds });
});

module.exports = {
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  getCategories,
  createCategories,
  uploadImage,
};
