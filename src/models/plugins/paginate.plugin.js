/* eslint-disable no-param-reassign */

const paginate = (schema) => {
  /**
   * @typedef {Object} QueryResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for documents with pagination
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {Array<Object>} [aggregatePipe] - Aggregate pipeline options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc). Multiple sorting criteria should be separated by commas (,)
   * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
   * @param {number} [options.limit] - Maximum number of results per page (default = 10)
   * @param {number} [options.page] - Current page (default = 1)*
   * @returns {Promise<QueryResult>}
   */
  schema.statics.paginate = async function (filter, options, aggregatePipe = []) {
    let sort = {};
    if (options.sortBy) {
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        sort[key] = order === 'desc' ? -1 : 1;
      });
    } else {
      sort = { createdAt: 1 };
    }

    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : undefined;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    const pagination = options.page && options.limit ? [{ $skip: skip }, { $limit: limit }] : [];
    const countPromise = this.countDocuments(filter).exec();
    const pipeLine = [{ $match: filter }, ...aggregatePipe, { $sort: sort }, ...pagination];
    let docsPromise = this.aggregate(pipeLine);

    docsPromise = docsPromise.exec();

    return Promise.all([countPromise, docsPromise]).then((values) => {
      const [totalResults, results] = values;
      const totalPages = Math.ceil(totalResults / (limit || totalResults));
      const result = {
        results,
        page: page || 1,
        limit: limit || totalResults,
        totalPages,
        totalResults,
      };
      return Promise.resolve(result);
    });
  };
};

module.exports = paginate;
