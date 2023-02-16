const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const redisClient = require('../config/redis-cache');
const { tokenTypes } = require('../config/tokens');
const logger = require('../config/logger');
const { getTokenKey } = require('../config/redisKeys');

/**
 * Generate token
 * @param {{phoneNumber: string, email: string, fullName: string}} userDetail
 * @param {moment.Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {Promise<string>}
 */
const generateToken = async (userDetail, expires, type, secret = config.jwt.secret) => {
  const key = getTokenKey(userDetail.phoneNumber, type);
  const now = moment();
  const payload = {
    user: userDetail,
    iat: now.unix(),
    exp: expires.unix(),
    type,
  };
  const token = jwt.sign(payload, secret, { algorithm: 'HS256' });
  const isAlreadyInCache = await redisClient.get(key);
  if (isAlreadyInCache) {
    await redisClient.del(key);
  }
  const expireInSecond = expires.diff(moment(), 'seconds');
  await redisClient.setEx(key, expireInSecond, token);
  return token;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Object>}
 */
const verifyToken = async (token, type) => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const tokenInCache = await redisClient.get(getTokenKey(payload.user.phoneNumber, type));
    if (tokenInCache === token) {
      return payload;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, `Invalid ${type} token`);
  } catch (e) {
    throw new ApiError(httpStatus.UNAUTHORIZED, `Invalid ${type} token`);
  }
};

/**
 * Remove token on logout
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.name
 * @param {string} user.phoneNumber
 * @param {string} user.email
 * @param {string} user.role
 * @param {boolean} user.isEmailVerified
 * @param {boolean} user.isDeleted
 * @returns {Promise<boolean>}
 */
const invalidateToken = async (user) => {
  try {
    const accessKey = getTokenKey(user.phoneNumber, tokenTypes.ACCESS);
    const refreshKey = getTokenKey(user.phoneNumber, tokenTypes.REFRESH);
    await redisClient.del(accessKey);
    await redisClient.del(refreshKey);
    return true;
    // eslint-disable-next-line no-empty
  } catch (e) {
    logger.error(`Error while logging out for ${tokenTypes.ACCESS} token with value ${token}`);
    return false;
  }
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minute');
  const accessToken = await generateToken(user, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'day');
  const refreshToken = await generateToken(user, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};
//
// /**
//  * Generate reset password token
//  * @param {string} email
//  * @returns {Promise<string>}
//  */
// const generateResetPasswordToken = async (email) => {
//   const user = await userService.getUserByEmail(email);
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
//   }
//   const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
//   const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
//   await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
//   return resetPasswordToken;
// };

// /**
//  * Generate verify email token
//  * @param {User} user
//  * @returns {Promise<string>}
//  */
// const generateVerifyEmailToken = async (user) => {
//   const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
//   const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
//   await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
//   return verifyEmailToken;
// };

module.exports = {
  verifyToken,
  generateAuthTokens,
  invalidateToken,
};
