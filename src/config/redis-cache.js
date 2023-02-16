const redis = require('redis');
const config = require('./config');

// create redis client
const client = redis.createClient({
  // host: config.redis.host,
  port: config.redis.port,
  // password: config.redis.password,
});

// eslint-disable-next-line no-console
client.on('error', (err) => console.log('Redis Client Error', err));

module.exports = client;
/**
 * @param {string} key
 * @param {Array|Object} value
 * @param {number} expireInSec
 * @returns {Promise<string>>}
 */
module.exports.cacheObjectOrArray = (key, value, expireInSec) => {
  const stringifyVal = JSON.stringify(value);
  return client.setEx(key, expireInSec, stringifyVal);
};

/**
 * @param {string} key
 * @returns {Promise<Array | Object>}
 */
module.exports.getCacheObjectOrArray = async (key) => {
  const val = await client.get(key);
  if (val) return JSON.parse(val);
  return '';
};
