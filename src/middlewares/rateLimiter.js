const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
});

module.exports = {
  authLimiter,
};
