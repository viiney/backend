const boolConverter = {
  false: false,
  true: true,
};

const checkIfIsBoolean = (value) => {
  try {
    if (typeof value === 'boolean') {
      return true;
    }
    return boolConverter[value] !== undefined;
  } catch (e) {
    return false;
  }
};
/**
 * Create an object composed of the picked object properties
 * @param {Object} object
 * @param {string[]} keys
 * @returns {Object}
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      // eslint-disable-next-line no-param-reassign
      obj[key] = checkIfIsBoolean(object[key]) ? boolConverter[object[key]] : object[key];
    }
    return obj;
  }, {});
};

/**
 * @param {Object} object
 * @param {Array<string>} keys
 * @returns {Object}
 */
const pickWithNoEmpty = (object, keys) => {
  return Object.keys(object)
    .filter((key) => {
      return keys.includes(key) && (checkIfIsBoolean(object[key]) ? true : !!object[key]);
    })
    .reduce((prev, key) => {
      // eslint-disable-next-line no-param-reassign
      prev[key] = checkIfIsBoolean(object[key]) ? boolConverter[object[key]] : object[key];
      return prev;
    }, {});
};

/**
 * @param {string} str
 * @returns {string}
 */
const capitalizeFirstLetterOfEachWord = (str) => {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1, word.length))
    .join(' ');
};
module.exports = { pick, pickWithNoEmpty, capitalizeFirstLetterOfEachWord };
