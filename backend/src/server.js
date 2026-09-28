const http = require('http');
const { env } = require('./config/env');
const { createApp } = require('./app');
const { getDb } = require('./db/database');
const { initSocket } = require('./socket');

function start() {
  getDb();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`Vedaz chat server listening on http://localhost:${env.port}`);
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
