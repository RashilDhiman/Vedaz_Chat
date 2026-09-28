const { env } = require('../config/env');
const { createMessage, listMessages } = require('../services/messageService');
const presence = require('../services/presenceService');
const { getIo } = require('../socket');

function getHistory(req, res, next) {
  try {
    const messages = listMessages({
      limit: req.query.limit,
      before: req.query.before,
    });
    res.json({ room: env.room, messages });
  } catch (error) {
    next(error);
  }
}

function sendMessage(req, res, next) {
  try {
    const message = createMessage({
      sender: req.user,
      text: req.body?.text,
    });

    const io = getIo();
    if (io) {
      io.to(env.room).emit('new_message', message);
    }

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
}

function getOnlineUsers(_req, res) {
  res.json({ onlineUsers: presence.listOnline() });
}

module.exports = { getHistory, sendMessage, getOnlineUsers };
