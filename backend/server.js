require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const connectDB = require('./src/config/db');
const agentRoutes = require('./src/routes/agentRoutes');
const repoRoutes = require('./src/routes/repoRoutes');
const initSocket = require('./src/socket/agentSocket');

const dns = require('dns');

// Use Google DNS
dns.setServers([
  '8.8.8.8',
  '8.8.4.4'
]);

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
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
app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`AgentForge backend running on port ${PORT}`);
    console.log(`AI Provider: ${process.env.AI_PROVIDER || 'NOT SET'}`);
});
