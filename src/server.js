const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const registerSockets = require('./sockets');
const socketAuth = require('./sockets/middleware/auth.socket');


const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set('io', io);
io.use(socketAuth);
registerSockets(io);


server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`REST: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api-docs`);
});
