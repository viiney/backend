const morgan = require('morgan');
const config = require('./config');
const logger = require('./logger');

morgan.token('message', (req, res) => res.locals.errorMessage || '');
morgan.token('stackTrace', (req, res) => res.locals.stackTrace || '');
morgan.token('input', (req) =>
  `\nInputs, Params: ${JSON.stringify(req.params)}, Query: ${JSON.stringify(req.query)}, Body: ${JSON.stringify(
    req.body
  )}`.trim()
);
const getIpFormat = () => (config.env === 'production' ? ':remote-addr - ' : '');
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - \n :input`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message \n stack trace: \n :stackTrace \n :input`;

const successHandler = morgan(successResponseFormat, {
  skip: (req, res) => res.statusCode >= 400,
  stream: { write: (message) => logger.info(message.trim()) },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (req, res) => res.statusCode < 400,
  stream: { write: (message) => logger.error(message.trim()) },
});

module.exports = {
  successHandler,
  errorHandler,
};
