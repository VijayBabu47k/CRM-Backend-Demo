const jwt = require('jsonwebtoken');

// Connected users map
const connectedUsers = new Map();

const initializeSocket = (io) => {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      // Allow anonymous connections for public events
      socket.userId = null;
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      // Continue with anonymous connection
      socket.userId = null;
      next();
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Add to connected users if authenticated
    if (socket.userId) {
      connectedUsers.set(socket.userId, socket.id);
      console.log(`👤 User ${socket.userId} connected`);
      
      // Notify others about online status
      socket.broadcast.emit('user:online', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Join user-specific room for targeted notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
    
    // Join admin room if user is admin
    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`👑 Socket ${socket.id} joined admin room`);
    });
    
    // Handle typing indicators (for future chat feature)
    socket.on('typing:start', (data) => {
      socket.broadcast.emit('typing:start', {
        userId: socket.userId,
        ...data
      });
    });
    
    socket.on('typing:stop', (data) => {
      socket.broadcast.emit('typing:stop', {
        userId: socket.userId,
        ...data
      });
    });
    
    // Handle notification read
    socket.on('notification:read', (notificationId) => {
      // Mark notification as read in database
      console.log(`📖 Notification ${notificationId} marked as read by user ${socket.userId}`);
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
      
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        
        // Notify others about offline status
        socket.broadcast.emit('user:offline', {
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });
  
  // Helper function to emit to specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };
  
  // Helper function to emit to all admins
  io.emitToAdmins = (event, data) => {
    io.to('admin').emit(event, data);
  };
  
  // Helper function to get connected users count
  io.getConnectedUsersCount = () => {
    return connectedUsers.size;
  };
  
  // Helper function to check if user is online
  io.isUserOnline = (userId) => {
    return connectedUsers.has(userId);
  };
  
  console.log('🔌 Socket.IO initialized');
  
  return io;
};

module.exports = {
  initializeSocket,
  connectedUsers
};
