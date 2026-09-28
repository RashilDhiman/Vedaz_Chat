const { Server } = require('socket.io');
const { env } = require('../config/env');
const { findByToken, touchLastSeen } = require('../services/userService');
const { createMessage, markReceipt } = require('../services/messageService');
const presence = require('../services/presenceService');
const { AppError } = require('../errors/AppError');

let io;

function corsOrigin() {
  return env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map(item => item.trim());
}

function typingSnapshot() {
  return presence
    .listOnline()
    .filter(user => user.typing)
    .map(user => user.username);
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin(),
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = findByToken(token);
      if (!user) {
        next(new Error('Unauthorized'));
        return;
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', socket => {
    const { user } = socket;
    presence.add(socket.id, user);
    touchLastSeen(user.id);
    socket.join(env.room);

    socket.emit('ready', {
      user,
      onlineUsers: presence.listOnline(),
    });
    socket.to(env.room).emit('presence', {
      onlineUsers: presence.listOnline(),
    });

    socket.on('send_message', (payload = {}, ack) => {
      try {
        const message = createMessage({ sender: user, text: payload.text });
        const event = { ...message, clientId: payload.clientId || null };
        io.to(env.room).emit('new_message', event);
        if (typeof ack === 'function') {
          ack({ ok: true, message: event });
        }
      } catch (error) {
        const message = error instanceof AppError ? error.message : 'Could not send message.';
        if (typeof ack === 'function') {
          ack({ ok: false, error: message });
        }
        socket.emit('error_message', { message });
      }
    });

    socket.on('typing', (payload = {}) => {
      presence.setTyping(socket.id, Boolean(payload.isTyping));
      socket.to(env.room).emit('typing', {
        username: user.username,
        isTyping: Boolean(payload.isTyping),
        typingUsers: typingSnapshot(),
      });
    });

    socket.on('message_receipt', (payload = {}, ack) => {
      try {
        const message = markReceipt({
          messageId: payload.messageId,
          username: user.username,
          status: payload.status,
        });
        io.to(env.room).emit('message_status', {
          id: message.id,
          status: message.status,
        });
        if (typeof ack === 'function') {
          ack({ ok: true, message });
        }
      } catch (error) {
        const message = error instanceof AppError ? error.message : 'Could not update receipt.';
        if (typeof ack === 'function') {
          ack({ ok: false, error: message });
        }
      }
    });

    socket.on('disconnect', () => {
      presence.setTyping(socket.id, false);
      presence.remove(socket.id);
      touchLastSeen(user.id);
      io.to(env.room).emit('typing', {
        username: user.username,
        isTyping: false,
        typingUsers: typingSnapshot(),
      });
      io.to(env.room).emit('presence', {
        onlineUsers: presence.listOnline(),
      });
    });
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = { initSocket, getIo };
