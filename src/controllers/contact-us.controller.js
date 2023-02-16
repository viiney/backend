const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { emailService } = require('../services');
const { pick } = require('../utils/pick');

const contactBack = catchAsync(async (req, res) => {
  const body = pick(req.body, ['from', 'subject', 'text']);
  await emailService.sendEmail(body.from, body.subject, body.text);
  res.status(httpStatus.ACCEPTED).send();
});

module.exports = {
  contactBack,
};
