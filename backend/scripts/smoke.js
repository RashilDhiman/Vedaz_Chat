/**
 * End-to-end check: login, REST history, Socket.io delivery, persistence.
 * Start the server first: npm start
 */
const { io } = require('socket.io-client');

const baseUrl = process.env.API_URL || 'http://localhost:4000';

async function login(username) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Login failed');
  }
  return body;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, { auth: { token }, timeout: 5000 });
    const timer = setTimeout(() => reject(new Error('Socket connect timed out')), 6000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function main() {
  const health = await fetch(`${baseUrl}/api/health`);
  if (!health.ok) {
    throw new Error('Health check failed');
  }

  const ada = await login('Ada');
  const grace = await login('Grace');
  const graceSocket = await connect(grace.token);

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Did not receive socket message')), 5000);
    graceSocket.on('new_message', message => {
      if (message.text === 'smoke-hello') {
        clearTimeout(timer);
        resolve(message);
      }
    });
  });

  const adaSocket = await connect(ada.token);
  const ack = await new Promise((resolve, reject) => {
    adaSocket.emit('send_message', { text: 'smoke-hello', clientId: 'smoke' }, response => {
      if (!response?.ok) {
        reject(new Error(response?.error || 'Send failed'));
        return;
      }
      resolve(response.message);
    });
  });

  const live = await received;

  const read = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Did not receive read receipt')), 5000);
    adaSocket.on('message_status', payload => {
      if (payload.id === ack.id && payload.status === 'read') {
        clearTimeout(timer);
        resolve(payload);
      }
    });
  });
  graceSocket.emit('message_receipt', { messageId: ack.id, status: 'read' });
  await read;

  const historyResponse = await fetch(`${baseUrl}/api/messages?limit=20`, {
    headers: { Authorization: `Bearer ${ada.token}` },
  });
  const history = await historyResponse.json();
  const stored = history.messages?.find(message => message.id === ack.id);

  const departed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Presence did not update on disconnect')), 5000);
    adaSocket.on('presence', payload => {
      const names = (payload.onlineUsers || []).map(user => user.username);
      if (!names.includes('Grace')) {
        clearTimeout(timer);
        resolve(payload);
      }
    });
  });
  graceSocket.disconnect();
  await departed;
  adaSocket.disconnect();

  if (!stored || stored.status !== 'read' || live.id !== ack.id) {
    throw new Error('Message was not stored, broadcast, or marked read');
  }

  console.log('Smoke test passed.');
  console.log(`Message ${ack.id} was stored and delivered to the other client.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
