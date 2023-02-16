const express = require('express');
const { watchHistoryController } = require('../../controllers');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { watchHistoryValidation } = require('../../validations');

const router = express.Router();

router.get('/all', auth(), validate(watchHistoryValidation.getAllHistory), watchHistoryController.getAllHistory);
router.post('/', auth(), validate(watchHistoryValidation.createOrUpdate), watchHistoryController.createOrUpdate);
router.delete('/', auth(), validate(watchHistoryValidation.deleteAllHistory), watchHistoryController.deleteAllHistory);
router.delete('/:historyId', auth(), validate(watchHistoryValidation.deleteHistory), watchHistoryController.deleteHistory);
router.get(
  '/counts',
  auth(),
  validate(watchHistoryValidation.getTotalPlayedAndTimeCount),
  watchHistoryController.getTotalTimeAndAudioWatched
);

module.exports = router;
