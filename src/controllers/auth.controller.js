const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService } = require('../services');
const { pick } = require('../utils/pick');

const register = catchAsync(async (req, res) => {
  const body = pick(req.body, ['email', 'name', 'phoneNumber', 'dob']);
  const user = await userService.createUser(body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const user = await authService.validatePhoneNumberAndOtp(phoneNumber, otp);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.OK).send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user);
  res.status(httpStatus.ACCEPTED).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.token);
  res.status(httpStatus.ACCEPTED).send({ ...tokens });
});

const sendOtp = catchAsync(async (req, res) => {
  await authService.sendOtp(req.body.phoneNumber);
  res.status(httpStatus.ACCEPTED).send();
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  sendOtp,
};
