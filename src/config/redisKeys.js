const getTokenKey = (phoneNumber, type) => `${phoneNumber}-${type}-token`;
const getOtp = (phoneNumber) => `${phoneNumber}-otp`;
const getSeriesKey = ({ limit, page, searchTerm, categoryId }) =>
  `limit--${limit}-page--${page}-searchTerm--${searchTerm}-categoryId--${categoryId}`;
const getEpisodeKey = (seriesId) => `episode-for-seriesId-${seriesId}`;
const getBannerKey = (status) => `banners-${status}`;
const getAuthorSeriesKey = (status) => `series-author-${status}`;

module.exports = { getTokenKey, getOtp, getSeriesKey, getEpisodeKey, getBannerKey, getAuthorSeriesKey };
