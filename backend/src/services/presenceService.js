const sessions = new Map();

function add(socketId, user) {
  sessions.set(socketId, {
    userId: user.id,
    username: user.username,
    typing: false,
  });
}

function remove(socketId) {
  const session = sessions.get(socketId) || null;
  sessions.delete(socketId);
  return session;
}

function setTyping(socketId, isTyping) {
  const session = sessions.get(socketId);
  if (!session) {
    return null;
  }
  session.typing = Boolean(isTyping);
  return session;
}

function listOnline() {
  const byUser = new Map();
  for (const session of sessions.values()) {
    const current = byUser.get(session.userId) || {
      id: session.userId,
      username: session.username,
      typing: false,
    };
    current.typing = current.typing || session.typing;
    byUser.set(session.userId, current);
  }
  return [...byUser.values()].sort((a, b) =>
    a.username.localeCompare(b.username),
  );
}

module.exports = {
  add,
  remove,
  setTyping,
  listOnline,
};
