const Razorpay = require('razorpay');
const { razorPay } = require('./config');

const instance = new Razorpay({
  key_id: razorPay.keyId,
  key_secret: razorPay.keySecret,
});
module.exports = instance;
