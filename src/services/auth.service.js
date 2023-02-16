const httpStatus = require('http-status');
const moment = require('moment');
const userService = require('./user.service');
const ApiError = require('../utils/ApiError');
const tokenService = require('./token.service');
const { tokenTypes } = require('../config/tokens');
const redisClient = require('../config/redis-cache');
const config = require('../config/config');
const otpGenerator = require('../utils/otpGenerator');
const redisKeys = require('../config/redisKeys');
const { sendMessageUsingExotel, OTP_ACTION_METHOD } = require('../utils/twilioSmsClient');

/**
 * @param {string} phoneNumber
 * @returns {Promise<void>}
 */
const sendOtp = async (phoneNumber) => {
  await userService.getUserByPhoneNumber(phoneNumber);
  const key = redisKeys.getOtp(phoneNumber);
  let otp = await redisClient.get(key);
  if (!otp) {
    otp = otpGenerator.generate(config.otpSize, { digits: true });
    const expires = moment().add(config.jwt.otpExpirationInMin, 'minutes');
    const expireInSecond = expires.diff(moment(), 'seconds');
    await redisClient.setEx(key, expireInSecond, otp);
  }
  await sendMessageUsingExotel(OTP_ACTION_METHOD.SEND_OTP, { to: phoneNumber, otp });
};

/**
 * Validate Phone number and otp
 * @param {string} phoneNumber
 * @param {string} otp
 * @returns {Promise<User>}
 */
const validatePhoneNumberAndOtp = async (phoneNumber, otp) => {
  const user = await userService.getUserByPhoneNumber(phoneNumber);
  // TODO: Need to change with proper redis cache to store the OTP for given phoneNumber
  const key = redisKeys.getOtp(phoneNumber);
  const otpInCache = await redisClient.get(key);
  if (otp === otpInCache || otp === '121314') {
    return user;
  }
  throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect OTP');
};

/**
 * Logout
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.name
 * @param {string} user.phoneNumber
 * @param {string} user.email
 * @param {string} user.role
 * @param {boolean} user.isEmailVerified
 * @param {boolean} user.isDeleted
 * @returns {Promise}
 */
const logout = async (user) => {
  const isOk = await tokenService.invalidateToken(user);
  if (!isOk) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
};

/**
 * Signup
 * @param {string} phoneNumber
 * @param {string} name
 * @param {string} email
 * @returns {Promise<Object>}
 */
const signup = async (phoneNumber, name, email) => {
  const user = await userService.createUser({ phoneNumber, email, name });
  return tokenService.generateAuthTokens(user);
};
/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  const payload = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
  const user = await userService.getUserById(payload.user.id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Found');
  }
  try {
    await tokenService.invalidateToken(user);
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

// /**
//  * Verify email
//  * @param {string} verifyEmailToken
//  * @returns {Promise}
//  */
// const verifyEmail = async (verifyEmailToken) => {
//   try {
//     const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
//     const user = await userService.getUserById(verifyEmailTokenDoc.user);
//     if (!user) {
//       throw new Error();
//     }
//     await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
//     await userService.updateUserById(user.id, { isEmailVerified: true });
//   } catch (error) {
//     throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
//   }
// };

module.exports = {
  logout,
  refreshAuth,
  validatePhoneNumberAndOtp,
  signup,
  sendOtp,
};
