const express = require('express');
const { noteController} = require('../../controllers');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { noteValidation } = require('../../validations');

const router = express.Router();

router.get('/', auth(), validate(noteValidation.getNote), noteController.getNote);
router.post('/', auth(), validate(noteValidation.createOrUpdateNote), noteController.createOrUpdateNote);
router.delete('/:noteId', auth(), validate(noteValidation.deleteNote), noteController.deleteNote);

module.exports = router;
