const { AppError } = require('../errors/AppError');

function notFound(_req, _res, next) {
  next(new AppError(404, 'Route not found.'));
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const status = error instanceof AppError ? error.status : 500;
  const message =
    error instanceof AppError ? error.message : 'Something went wrong. Please try again.';

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
