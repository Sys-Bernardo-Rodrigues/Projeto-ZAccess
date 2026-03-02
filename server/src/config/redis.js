const Redis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = () => {
    redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryStrategy: (times) => {
            const delay = Math.min(times * 100, 3000);
            return delay;
        },
        maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
        logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
        logger.error(`❌ Redis error: ${err.message} (code: ${err.code || 'N/A'})`);
    });

    redisClient.on('reconnecting', () => {
        logger.warn('🔄 Redis reconnecting...');
    });

    return redisClient;
};

const getRedisClient = () => {
    if (!redisClient) {
        return connectRedis();
    }
    return redisClient;
};

module.exports = { connectRedis, getRedisClient };
