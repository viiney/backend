const httpStatus = require('http-status');
const { pick, pickWithNoEmpty } = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { bannerService } = require('../services');
const { roleEnum } = require('../config/roles');
const { bannerStatus } = require('../utils/banners.utils');

const createBanners = catchAsync(async (req, res) => {
  const filter = pick(req.body, ['type', 'startDate', 'endDate', 'seriesId']);
  await bannerService.createBanner(filter.type, filter.startDate, filter.endDate, filter.seriesId, req.file);
  res.status(httpStatus.CREATED).send();
});

const getBanner = catchAsync(async (req, res) => {
  const { role } = req.user;
  const status = role === roleEnum.user ? bannerStatus.ACTIVE : req.query.status;
  const data = await bannerService.getBannerByStatus(status, req.query.forced);
  res.status(httpStatus.OK).send(data);
});

const updateBanner = catchAsync(async (req, res) => {
  const { bannerId } = req.params;
  const updateBody = pickWithNoEmpty(req.body, ['type', 'startDate', 'endDate', 'seriesId']);
  await bannerService.updateBanner(bannerId, updateBody, req.file);
  res.status(httpStatus.ACCEPTED).send();
});

const deleteBanner = catchAsync(async (req, res) => {
  const { bannerId } = req.params;
  await bannerService.deleteBanner(bannerId);
  res.status(httpStatus.ACCEPTED).send();
});

module.exports = {
  createBanners,
  getBanner,
  updateBanner,
  deleteBanner,
};
