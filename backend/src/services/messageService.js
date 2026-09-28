const crypto = require('crypto');
const { getDb } = require('../db/database');
const { AppError } = require('../errors/AppError');
const { env } = require('../config/env');

const MAX_TEXT_LENGTH = 2000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function toMessage(row) {
  return {
    id: row.id,
    room: row.room,
    senderId: row.sender_id,
    senderName: row.sender_name,
    text: row.text,
    createdAt: row.created_at,
    status: row.status,
  };
}

function createMessage({ sender, text, room = env.room }) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new AppError(400, 'Message text is required.');
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new AppError(400, `Message must be ${MAX_TEXT_LENGTH} characters or fewer.`);
  }

  const message = {
    id: crypto.randomUUID(),
    room,
    senderId: sender.id,
    senderName: sender.username,
    text: trimmed,
    createdAt: Date.now(),
    status: 'sent',
  };

  getDb()
    .prepare(
      `INSERT INTO messages (id, room, sender_id, sender_name, text, created_at, status)
       VALUES (@id, @room, @senderId, @senderName, @text, @createdAt, @status)`,
    )
    .run(message);

  return message;
}

function listMessages({ room = env.room, limit = DEFAULT_LIMIT, before } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const beforeTs = before ? Number(before) : null;

  if (before && Number.isNaN(beforeTs)) {
    throw new AppError(400, 'Query param "before" must be a unix timestamp in milliseconds.');
  }

  const rows = getDb()
    .prepare(
      `SELECT * FROM messages
       WHERE room = ?
         AND (? IS NULL OR created_at < ?)
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(room, beforeTs, beforeTs, safeLimit);

  return rows.reverse().map(toMessage);
}

function getMessage(id) {
  const row = getDb().prepare('SELECT * FROM messages WHERE id = ?').get(id);
  return row ? toMessage(row) : null;
}

/**
 * Record that someone other than the sender received or read a message.
 * Status only moves forward: sent -> delivered -> read.
 */
function markReceipt({ messageId, username, status }) {
  if (status !== 'delivered' && status !== 'read') {
    throw new AppError(400, 'Receipt status must be "delivered" or "read".');
  }

  const message = getMessage(messageId);
  if (!message) {
    throw new AppError(404, 'Message not found.');
  }

  if (message.senderName.toLowerCase() === username.toLowerCase()) {
    return message;
  }

  const now = Date.now();
  const existing = getDb()
    .prepare(
      'SELECT status FROM message_receipts WHERE message_id = ? AND username = ?',
    )
    .get(messageId, username);

  const nextStatus =
    existing?.status === 'read' || status === 'read' ? 'read' : 'delivered';

  getDb()
    .prepare(
      `INSERT INTO message_receipts (message_id, username, status, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(message_id, username) DO UPDATE SET
         status = excluded.status,
         updated_at = excluded.updated_at`,
    )
    .run(messageId, username, nextStatus, now);

  const aggregate =
    nextStatus === 'read' || message.status === 'read' ? 'read' : 'delivered';

  if (aggregate !== message.status) {
    getDb()
      .prepare('UPDATE messages SET status = ? WHERE id = ?')
      .run(aggregate, messageId);
    message.status = aggregate;
  }

  return message;
}

module.exports = {
  createMessage,
  listMessages,
  getMessage,
  markReceipt,
};
