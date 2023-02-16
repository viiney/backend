const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { pickWithNoEmpty } = require('../utils/pick');
const { noteService } = require('../services');

const createOrUpdateNote = catchAsync(async (req, res) => {
  const body = pickWithNoEmpty(req.body, ['podcastId', 'seriesId', 'notes']);
  const userId = req.user._id;
  await noteService.createOrUpdateNoteForSeries(userId, body.notes, body.seriesId);
  res.status(httpStatus.ACCEPTED).send();
});

const getNote = catchAsync(async (req, res) => {
  const query = pickWithNoEmpty(req.query, ['seriesId']);
  const userId = req.user._id;
  if (query.seriesId === 'all') {
    const notes = await noteService.getAllSeriesNotes(userId);
    res.status(httpStatus.OK).send({ data: notes });
  } else {
    const note = await noteService.getSeriesNote(userId, query.seriesId);
    res.status(httpStatus.OK).send({ data: note });
  }
});

const deleteNote = catchAsync(async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user._id;
  await noteService.deleteNote(userId, noteId);
  res.status(httpStatus.ACCEPTED).send();
});

module.exports = {
  createOrUpdateNote,
  getNote,
  deleteNote,
};
