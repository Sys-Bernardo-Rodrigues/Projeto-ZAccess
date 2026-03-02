const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
    nodeEnv: process.env.NODE_ENV || 'development',
    server: {
        port: parseInt(process.env.SERVER_PORT, 10) || 3001,
        host: process.env.SERVER_HOST || '0.0.0.0',
    },
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/zacess',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || '',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default_secret_change_me',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
};
