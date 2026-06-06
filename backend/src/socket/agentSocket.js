const initSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('subscribe:task', (taskId) => {
            socket.join(`task:${taskId}`);
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
};

module.exports = initSocket;
