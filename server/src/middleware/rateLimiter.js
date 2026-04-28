const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 500, // Aumentado para o Dashboard
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Muitas requisições. Tente novamente em breve.',
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    },
});

const docsLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas tentativas no login da documentação. Tente novamente em 15 minutos.',
});

module.exports = { apiLimiter, authLimiter, docsLoginLimiter };
