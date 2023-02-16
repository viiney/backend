const express = require('express');
const auth = require('../../middlewares/auth');
const withOrWithoutAuth = require('../../middlewares/withOrWithoutAuth');
const validate = require('../../middlewares/validate');
const { seriesController, episodeController } = require('../../controllers');
const { rights } = require('../../config/roles');
const { seriesValidation, episodeValidation } = require('../../validations');
const { upload } = require('../../middlewares/multer');

const router = express.Router();

// Series
// router.post(
//   '/updateAudioDuration',
//   catchAsync(async (req, res) => {
//     const episodes = await Episode.find({ isDeleted: false }).exec();
//     await Promise.all(
//       episodes.map(async (episode) => {
//         const { key, metaInfo } = episode.audio;
//         if (metaInfo.duration) {
//           return Promise.resolve();
//         }
//         const duration = await getDurationOfAudio(episode.audio.s3Url());
//         metaInfo.duration = duration;
//         return Episode.updateOne({ _id: episode._id }, { metaInfo }).exec();
//       })
//     );
//     res.send();
//   })
// );
router.get('/', validate(seriesValidation.getSeries), seriesController.getSeries);
router.put(
  '/:seriesId',
  auth(rights.MANAGE_SERIES),
  upload.fields([
    { name: 'images', maxCount: 1 },
    { name: 'thumbnailImage', maxCount: 1 },
  ]),
  validate(seriesValidation.updateSeries),
  seriesController.updateSeries
);
router.post(
  '/:categoryId',
  auth(rights.MANAGE_SERIES),
  upload.fields([
    { name: 'images', maxCount: 1 },
    { name: 'thumbnailImage', maxCount: 1 },
  ]),
  validate(seriesValidation.createSeries),
  seriesController.createSeries
);
router.delete(
  '/:seriesId',
  auth(rights.MANAGE_SERIES),
  validate(seriesValidation.deleteSeries),
  seriesController.deleteSeries
);

// Episodes
router.get('/episodes', episodeController.getAllEpisodes);
router.get('/:seriesId', validate(episodeValidation.getAllEpisode), episodeController.getEpisodesForSeries);
router.put(
  '/:seriesId/:episodeId',
  auth(rights.MANAGE_SERIES),
  upload.single('audio'),
  validate(episodeValidation.updateEpisode),
  episodeController.updateEpisodeForSeries
);
router.post(
  '/episode/:seriesId',
  auth(rights.MANAGE_SERIES),
  upload.fields([{ name: 'audio', maxCount: 1 }]),
  validate(episodeValidation.createEpisode),
  episodeController.createEpisodeForSeries
);
router.delete(
  '/episode/:episodeId',
  auth(rights.MANAGE_SERIES),
  validate(episodeValidation.deleteEpisode),
  episodeController.deleteEpisodeForSeries
);
router.get(
  '/episode/:episodeId/recording',
  auth(),
  validate(episodeValidation.getRecording),
  episodeController.getRecording
);
router.get('/episode/:episodeId', validate(episodeValidation.getEpisode), episodeController.getEpisode);
router.post('/image/upload', upload.single('image'), seriesController.uploadImage);
module.exports = router;
