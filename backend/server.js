require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const connectDB = require('./src/config/db');
const agentRoutes = require('./src/routes/agentRoutes');
const repoRoutes = require('./src/routes/repoRoutes');
const initSocket = require('./src/socket/agentSocket');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: '*' }
});

// Middleware
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        aiProvider: process.env.AI_PROVIDER || 'not set',
        timestamp: new Date().toISOString()
    });
});

// Database
connectDB();

// Routes
app.use('/api/agent', agentRoutes);
app.use('/api/repo', repoRoutes);

// Socket.IO
initSocket(io);

// Make io accessible in controllers
app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`AgentForge backend running on port ${PORT}`);
    console.log(`AI Provider: ${process.env.AI_PROVIDER || 'NOT SET'}`);
});
