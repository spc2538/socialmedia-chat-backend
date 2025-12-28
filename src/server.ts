import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import socketHandler from './sockets';
import socketAuth from './sockets/middleware/auth.socket';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.set('io', io);
io.use(socketAuth);
socketHandler(io);

httpServer.listen(3000, () => {
  console.log('Server running on port 3000');
});
