const httpStatus = require('http-status');
const { pick, pickWithNoEmpty } = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { roleEnum } = require('../config/roles');
const ApiError = require('../utils/ApiError');

const getUsers = catchAsync(async (req, res) => {
  // Need to refactor and put all the db query logic in service;
  const filter = pickWithNoEmpty(req.query, ['name', 'email']);
  if (req.user.role === roleEnum.admin && filter && filter.role === roleEnum.superAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, "Admin can't view super admin details");
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await userService.queryUsers(filter, options, req.query.role, req.user.role);
  res.status(httpStatus.OK).send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId || req.user._id);
  res.status(httpStatus.OK).send({ user });
});

const updateUser = catchAsync(async (req, res) => {
  const body = pick(req.body, [
    'name',
    'description',
    'email',
    'dob',
    'state',
    'city',
    'qualification',
    'preparingFor',
    'occupation',
  ]);
  const user = await userService.updateUserById(req.user._id, body, req.file);
  res.status(httpStatus.OK).send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.softDeleteByUserId(req.params.userId);
  res.status(httpStatus.ACCEPTED).send();
});

const provideAdminAccess = catchAsync(async (req, res) => {
  await userService.provideAdminAccess(req.params.userId);
  res.status(httpStatus.ACCEPTED).send();
});

const createUserByAdmin = catchAsync(async (req, res) => {
  const { name, email, phoneNumber, dob } = pick(req.body, ['name', 'email', 'phoneNumber', 'dob']);
  const image = req.file;
  await userService.createAdmin({
    name,
    email,
    phoneNumber,
    image,
    dob,
  });
  res.status(httpStatus.CREATED).send();
});

const countReferralCode = catchAsync(async (req, res) => {
  const { referralCode, signupUserId, metaInfo } = pick(req.body, ['referralCode', 'signupUserId', 'metaInfo']);
  await userService.countReferralCode(referralCode, signupUserId, metaInfo);
  res.status(httpStatus.CREATED).send();
});

const getUserLiveData = catchAsync(async (req, res) => {
  const response = await userService.getUserLiveData();
  res.status(httpStatus.CREATED).send({ data: response });
});
module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  provideAdminAccess,
  createUserByAdmin,
  countReferralCode,
  getUserLiveData,
};
