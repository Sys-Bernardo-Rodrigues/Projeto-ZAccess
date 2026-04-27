const winston = require('winston');
const path = require('path');
const config = require('../config/env');

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { service: 'zacess-server' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 1
                        ? ` ${JSON.stringify(meta)}`
                        : '';
                    return `${timestamp} [${level}]: ${message}${metaStr}`;
                })
            ),
        }),
        new winston.transports.File({
            filename: path.resolve(__dirname, '../../logs/server.log'),
            format: logFormat,
        }),
    ],
});

module.exports = logger;
