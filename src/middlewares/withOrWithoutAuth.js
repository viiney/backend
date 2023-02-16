const auth = require('./auth');

module.exports =
  (...requiredRights) =>
  async (req, res, next) => {
    if (req.headers.Authorization) {
      return auth(...requiredRights);
    }
    next();
  };
