const { login } = require('../services/userService');

function loginUser(req, res, next) {
  try {
    const result = login(req.body?.username);
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { loginUser };
