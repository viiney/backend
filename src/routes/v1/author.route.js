const express = require('express');
const auth = require('../../middlewares/auth');
const { rights } = require('../../config/roles');
const { authorController } = require('../../controllers');
const { upload } = require('../../middlewares/multer');
const validate = require('../../middlewares/validate');
const { authorValidation } = require('../../validations');

const router = express.Router();

router.post(
  '/',
  auth(rights.MANAGE_AUTHORS),
  upload.single('image'),
  validate(authorValidation.createAuthor),
  authorController.createAuthor
);
router.get('/', validate(authorValidation.getAuthors), authorController.getAuthors);
router.put(
  '/:authorId',
  auth(rights.MANAGE_AUTHORS),
  upload.single('image'),
  validate(authorValidation.updateAuthor),
  authorController.updateAuthor
);
router.delete(
  '/:authorId',
  auth(rights.MANAGE_AUTHORS),
  validate(authorValidation.deleteAuthor),
  authorController.deleteAuthor
);

router.get('/series/withoutAuthor', authorController.getAllSeriesWithoutAuthor);
router.get('/series/withAuthor', validate(authorValidation.getSeriesWithAuthor), authorController.getSeriesWithAuthors);
router.get('/series/:authorId', validate(authorValidation.getSeriesForAuthor), authorController.getSeriesForAuthor);
router.post(
  '/series/link',
  auth(rights.MANAGE_AUTHORS),
  validate(authorValidation.linkOrDelinkSeries),
  authorController.linkAuthorToSeries
);
router.put(
  '/series/forceLink',
  auth(rights.MANAGE_AUTHORS),
  validate(authorValidation.linkOrDelinkSeries),
  authorController.linkAuthorToNewSeries
);
router.put(
  '/series/promoteOrDemote',
  auth(rights.MANAGE_AUTHORS),
  validate(authorValidation.promoteOrDemoteSeries),
  authorController.promoteOrDemoteSeries
);
router.delete(
  '/series/unlink',
  auth(rights.MANAGE_AUTHORS),
  validate(authorValidation.linkOrDelinkSeries),
  authorController.deLinkSeries
);

module.exports = router;
