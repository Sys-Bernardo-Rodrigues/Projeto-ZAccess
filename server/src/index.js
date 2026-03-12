// Zaccess Server Entry Point - Updated!
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const connectDatabase = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const openapiSpec = require('./docs/openapi');

// Routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const locationRoutes = require('./routes/locations');
const locationUserRoutes = require('./routes/locationUsers');
const relayRoutes = require('./routes/relays');
const logRoutes = require('./routes/logs');
const userRoutes = require('./routes/users');
const inputRoutes = require('./routes/inputRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const automationRoutes = require('./routes/automationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const appRoutes = require('./routes/app');

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
        origin: true, // Permite conexões do painel (localhost) e dos dispositivos (IP do Pi ou qualquer origem)
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
// CORS: em desenvolvimento aceita qualquer localhost/127.0.0.1 e o app Flutter (web ou mobile)
const isDev = config.nodeEnv !== 'production';
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const localhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
        const allowed = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
        ];
        if (localhost || allowed.includes(origin) || isDev) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.jwt.secret));
app.use(morgan('dev'));

// ============================================
// OpenAPI / Swagger UI – tela de login simples
// ============================================
const docsAuth = (req, res, next) => {
    const { username, password } = config.docs;
    if (!username || !password) {
        logger.warn(
            `Docs desabilitada - config.docs.username="${username}", config.docs.password="${
                password ? '***' : ''
            }"`
        );
        return res.status(503).json({
            success: false,
            message: 'Documentação desabilitada: DOCS_USERNAME/DOCS_PASSWORD não configurados.',
        });
    }

    // 1) Se já tem cookie de sessão válido, permite
    if (req.signedCookies && req.signedCookies.docsAuth === 'ok') {
        return next();
    }

    // 2) Se vier Basic Auth (ex.: via ferramenta externa), continua aceitando
    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const [user, pass] = decoded.split(':');
        if (user === username && pass === password) {
            return next();
        }
    }

    // 3) Caso contrário, redireciona para a tela de login HTML
    return res.redirect('/docs/login');
};

// Tela de login (GET)
app.get('/docs/login', (req, res) => {
    const { username, password } = config.docs;
    if (!username || !password) {
        return res.status(503).send('Documentação desabilitada: DOCS_USERNAME/DOCS_PASSWORD não configurados.');
    }

    if (req.signedCookies && req.signedCookies.docsAuth === 'ok') {
        return res.redirect('/docs');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Zaccess API Docs – Login</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background:#0f172a; color:#e5e7eb; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { background:#020617; border-radius:12px; padding:32px; width:100%; max-width:380px; box-shadow:0 20px 40px rgba(15,23,42,0.7); border:1px solid #1f2937; }
    h1 { margin:0 0 8px; font-size:1.4rem; }
    p { margin:0 0 24px; font-size:0.9rem; color:#9ca3af; }
    label { display:block; font-size:0.8rem; margin-bottom:4px; color:#e5e7eb; }
    input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid #374151; background:#020617; color:#e5e7eb; font-size:0.9rem; margin-bottom:16px; box-sizing:border-box; }
    input:focus { outline:none; border-color:#22c55e; box-shadow:0 0 0 1px #22c55e33; }
    button { width:100%; padding:10px 12px; border-radius:8px; border:none; background:#22c55e; color:#020617; font-weight:600; font-size:0.9rem; cursor:pointer; }
    button:hover { background:#16a34a; }
    .hint { margin-top:12px; font-size:0.75rem; color:#6b7280; text-align:center; }
    .error { color:#f97373; font-size:0.8rem; margin-bottom:12px; text-align:center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Zaccess API Docs</h1>
    <p>Informe as credenciais de documentação para acessar o Swagger UI.</p>
    <form method="POST" action="/docs/login">
      <label for="username">Usuário</label>
      <input id="username" name="username" type="text" autocomplete="username" required />
      <label for="password">Senha</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Entrar</button>
    </form>
    <div class="hint">Apenas para uso interno de desenvolvimento/administração.</div>
  </div>
</body>
</html>`);
});

// Tela de login (POST)
app.post('/docs/login', (req, res) => {
    const { username, password } = config.docs;
    if (!username || !password) {
        return res.status(503).send('Documentação desabilitada: DOCS_USERNAME/DOCS_PASSWORD não configurados.');
    }

    const { username: formUser, password: formPass } = req.body || {};
    if (formUser === username && formPass === password) {
        res.cookie('docsAuth', 'ok', {
            httpOnly: true,
            sameSite: 'lax',
            signed: true,
            // Em produção, definir secure:true se usar HTTPS
        });
        return res.redirect('/docs');
    }

    res.status(401).send('Credenciais inválidas para documentação.');
});

// Logout simples
app.post('/docs/logout', (req, res) => {
    res.clearCookie('docsAuth');
    return res.redirect('/docs/login');
});

app.use('/docs', docsAuth, swaggerUi.serve, swaggerUi.setup(openapiSpec));

// ============================================
// Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/devices', apiLimiter, deviceRoutes);
app.use('/api/locations/:locationId/users', apiLimiter, locationUserRoutes);
app.use('/api/locations', apiLimiter, locationRoutes);
app.use('/api/relays', apiLimiter, relayRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/logs', apiLimiter, logRoutes);
app.use('/api/inputs', apiLimiter, inputRoutes);
app.use('/api/schedules', apiLimiter, scheduleRoutes);
app.use('/api/automations', apiLimiter, automationRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/app', appRoutes);

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
