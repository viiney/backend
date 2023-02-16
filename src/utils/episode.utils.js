const { capitalizeFirstLetterOfEachWord } = require('./pick');
const { FileUpload } = require('../models');

async function toEpisode(episode) {
  const episodeRes = {
    id: episode._id,
    name: capitalizeFirstLetterOfEachWord(episode.name),
    order: episode.order,
    isFree: episode.seriesId.isFree || episode.isFree,
    description: episode.seriesId.description,
    createdAt: episode.createdAt,
    seriesId: episode.seriesId._id,
  };
  const image = await FileUpload.findById(episode.seriesId.images[0]).exec();
  return {
    ...episodeRes,
    imagesUrls: [image ? FileUpload.s3Url(image) : ''],
    audioUrl: FileUpload.s3Url(episode.audio),
  };
}

module.exports = {
  toEpisode,
};
