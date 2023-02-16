const Client = require('twilio');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');

const client = Client(config.twilio.sid, config.twilio.authToken);

const OTP_ACTION_METHOD = {
  SEND_OTP: 'SEND_OTP',
};

const otpActions = {
  SEND_OTP(payload) {
    return `Your OTP To Join PrepAud is ${payload.otp} Please do not share your OTP with anyone for security purpose.`;
  },
};

/**
 *
 * @param {string} action
 * @param {Object} payload
 * @param {string} payload.to
 * @returns
 */
const sendMessageUsingTwilio = async (action, payload) => {
  if (!OTP_ACTION_METHOD[action]) {
    throw new Error('No action provided');
  }
  const opts = {
    body: otpActions[action](payload),
    from: config.twilio.phoneNumber,
    to: !payload.to.startsWith('+91') ? `+91${payload.to}` : payload.to,
  };
  const response = await client.messages.create(opts);
  return response;
};

/**
 *
 * @param {string} action
 * @param {Object} payload
 * @param {string} payload.to
 * @returns
 */
const sendMessageUsingExotel = async (action, payload) => {
  if (!OTP_ACTION_METHOD[action]) {
    throw new Error('No action provided');
  }
  const { apiKey, apiToken, subdomain, accountSid, callerId } = config.exotel;
  const url = `https://${apiKey}:${apiToken}${subdomain}/v1/Accounts/${accountSid}/Sms/send`;
  const formData = new FormData();
  formData.append('From', callerId);
  formData.append('To', !payload.to.startsWith('+91') ? `+91${payload.to}` : payload.to)
  formData.append('Body', otpActions[action](payload));
  formData.append('Priority', 'high');
  await axios.post(url, formData);
};
module.exports = {
  sendMessageUsingTwilio,
  sendMessageUsingExotel,
  OTP_ACTION_METHOD,
};
