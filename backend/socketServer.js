// socketServer.js
const socketIo = require('socket.io');

function initializeSocket(server) {
    const io = socketIo(server);
    const onlineUsers = new Set();

    io.on('connection', (socket) => {
        console.log('A user connected');

        const userId = socket.handshake.query.userId;
        onlineUsers.add(userId);
        io.emit('onlineUsers', Array.from(onlineUsers));

        socket.on('joinTeam', (teamName) => {
            socket.join(teamName);
            console.log(`User joined team: ${teamName}`);
        });

        socket.on('sendMessage', (data) => {
            const {
                teamName,
                message,
                username
            } = data;
            const timestamp = new Date().toISOString();
            io.to(teamName).emit('receiveMessage', {
                message,
                username,
                timestamp
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
            onlineUsers.delete(userId);
            io.emit('onlineUsers', Array.from(onlineUsers));
        });

        // Handle joining a different team
        socket.on('joinDifferentTeam', (data) => {
            const {
                teamName,
                username,
                originalTeam
            } = data;
            socket.join(teamName);
            console.log(`User ${username} joined different team: ${teamName}`);
            io.to(teamName).emit('receiveNotification', {
                message: `${username} from team ${originalTeam} has joined your team chat.`,
                username: 'System',
                timestamp: new Date().toISOString()
            });
        });
    });

    return io;
}

module.exports = initializeSocket;