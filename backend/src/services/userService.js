const crypto = require('crypto');
const { getDb } = require('../db/database');
const { AppError } = require('../errors/AppError');

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,20}$/;

function normalizeUsername(username) {
  return String(username || '').trim();
}

function assertUsername(username) {
  if (!USERNAME_PATTERN.test(username)) {
    throw new AppError(
      400,
      'Username must be 2–20 characters and use only letters, numbers, or underscores.',
    );
  }
}

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    lastSeen: row.last_seen,
  };
}

function findByUsername(username) {
  return getDb()
    .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
    .get(username);
}

function findByToken(token) {
  if (!token) {
    return null;
  }
  const row = getDb().prepare('SELECT * FROM users WHERE token = ?').get(token);
  return row ? toPublicUser(row) : null;
}

function login(rawUsername) {
  const username = normalizeUsername(rawUsername);
  assertUsername(username);

  const existing = findByUsername(username);
  if (existing) {
    return {
      token: existing.token,
      user: toPublicUser(existing),
      created: false,
    };
  }

  const user = {
    id: crypto.randomUUID(),
    username,
    token: crypto.randomBytes(24).toString('hex'),
    createdAt: Date.now(),
  };

  getDb()
    .prepare(
      `INSERT INTO users (id, username, token, created_at, last_seen)
       VALUES (@id, @username, @token, @createdAt, @createdAt)`,
    )
    .run(user);

  return {
    token: user.token,
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      lastSeen: user.createdAt,
    },
    created: true,
  };
}

function touchLastSeen(userId) {
  getDb()
    .prepare('UPDATE users SET last_seen = ? WHERE id = ?')
    .run(Date.now(), userId);
}

module.exports = {
  findByToken,
  login,
  touchLastSeen,
};
