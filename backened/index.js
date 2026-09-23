const http = require('http');
const { Server } = require('socket.io');

const { port } = require('./config');
const { createApp } = require('./app');
const { setupSocket } = require('./socket');

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
});

app.set('io', io);
setupSocket(io);

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MetroMind backend listening on :${port}`);
});