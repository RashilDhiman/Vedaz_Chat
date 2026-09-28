const { findByToken } = require('../services/userService');
const { AppError } = require('../errors/AppError');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const user = findByToken(token);

  if (!user) {
    next(new AppError(401, 'A valid bearer token is required.'));
    return;
  }

  req.user = user;
  next();
}

module.exports = { requireAuth };
