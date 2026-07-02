import { verifyToken } from '../utils/jwt.js';

export function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      socket.user = { role: 'guest' };
      return next();
    }
    try {
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch {
      socket.user = { role: 'guest' };
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.user?.role || 'guest'})`);

    socket.on('subscribe:bus', (busId) => {
      socket.join(`bus-${busId}`);
      socket.emit('subscribed', { busId });
    });

    socket.on('unsubscribe:bus', (busId) => {
      socket.leave(`bus-${busId}`);
    });

    socket.on('subscribe:route', (routeId) => {
      socket.join(`route-${routeId}`);
    });

    socket.on('driver:location', (data) => {
      if (socket.user?.role !== 'driver') return;
      io.emit('bus:location', data);
      if (data.busId) {
        io.to(`bus-${data.busId}`).emit('bus:location', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
