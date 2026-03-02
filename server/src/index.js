// Zaccess Server Entry Point - Updated!
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const connectDatabase = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const locationRoutes = require('./routes/locations');
const relayRoutes = require('./routes/relays');
const logRoutes = require('./routes/logs');
const userRoutes = require('./routes/users');
const inputRoutes = require('./routes/inputRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const automationRoutes = require('./routes/automationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const invitationRoutes = require('./routes/invitationRoutes');

// Services
const { initScheduleService } = require('./services/scheduleService');
const automationService = require('./services/automationService');

// Socket
const setupDeviceSocket = require('./socket/deviceSocket');

const app = express();
const server = http.createServer(app);

// ============================================
// Socket.IO Setup
// ============================================
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

app.set('io', io);

// ============================================
// Middleware
// ============================================
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ============================================
// Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/devices', apiLimiter, deviceRoutes);
app.use('/api/locations', apiLimiter, locationRoutes);
app.use('/api/relays', apiLimiter, relayRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/logs', apiLimiter, logRoutes);
app.use('/api/inputs', apiLimiter, inputRoutes);
app.use('/api/schedules', apiLimiter, scheduleRoutes);
app.use('/api/automations', apiLimiter, automationRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/invitations', invitationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Zaccess Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Rota ${req.originalUrl} não encontrada`,
    });
});

// Error handler
app.use(errorHandler);

// ============================================
// Start Server
// ============================================
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Connect to Redis
        connectRedis();

        // Setup Socket.IO
        setupDeviceSocket(io);

        // Initialize Services
        initScheduleService(io);
        automationService.init(io);

        // Start listening
        server.listen(config.server.port, config.server.host, () => {
            logger.info('='.repeat(50));
            logger.info('🚀 Zaccess Server started successfully');
            logger.info(`📡 HTTP: http://${config.server.host}:${config.server.port}`);
            logger.info(`🔌 WebSocket: ws://${config.server.host}:${config.server.port}`);
            logger.info(`🌍 Environment: ${config.nodeEnv}`);
            logger.info('='.repeat(50));
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
});

startServer();
