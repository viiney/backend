const express = require('express');
const validate = require('../../middlewares/validate');
const { contactUsValidation } = require('../../validations');
const { contactUsController } = require('../../controllers');

const router = express.Router();

router.post('/contact', validate(contactUsValidation.contactUs), contactUsController.contactBack);
module.exports = router;
