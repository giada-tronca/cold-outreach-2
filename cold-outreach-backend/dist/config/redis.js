"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = exports.redis = void 0;
exports.testRedisConnection = testRedisConnection;
exports.getRedisInfo = getRedisInfo;
exports.closeRedisConnections = closeRedisConnections;
const ioredis_1 = __importDefault(require("ioredis"));
const environment_1 = require("./environment");
/**
 * Parse Redis URL to extract connection details
 */
function parseRedisUrl(url) {
    try {
        const redisUrl = new URL(url);
        return {
            host: redisUrl.hostname || 'localhost',
            port: redisUrl.port ? parseInt(redisUrl.port, 10) : 6379,
            password: redisUrl.password || undefined,
            db: redisUrl.pathname ? parseInt(redisUrl.pathname.slice(1), 10) || 0 : 0,
        };
    }
    catch {
        // Fallback for simple host:port format
        const [host, port] = url.split(':');
        return {
            host: host || 'localhost',
            port: port ? parseInt(port, 10) : 6379,
            password: undefined,
            db: 0,
        };
    }
}
const redisUrlParts = parseRedisUrl(environment_1.envConfig.REDIS_URL);
/**
 * Redis connection configuration
 */
const redisConfig = {
    host: redisUrlParts.host,
    port: redisUrlParts.port,
    db: redisUrlParts.db,
    ...(redisUrlParts.password && { password: redisUrlParts.password }),
    // Connection pool settings
    maxRetriesPerRequest: null, // Required for BullMQ
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: false,
    keepAlive: 30000,
    family: 4,
    // Connection timeout
    connectTimeout: 30000,
    commandTimeout: 30000,
    // Retry strategy
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    // Connection events
    reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
    },
};
/**
 * Create Redis connection instance
 */
exports.redis = new ioredis_1.default(redisConfig);
/**
 * Redis connection events
 */
exports.redis.on('connect', () => {
    console.log('📡 [Redis]: Connected to Redis server');
});
exports.redis.on('ready', () => {
    console.log('✅ [Redis]: Redis connection is ready');
});
exports.redis.on('error', error => {
    console.error('❌ [Redis]: Redis connection error:', error);
});
exports.redis.on('close', () => {
    console.log('🔌 [Redis]: Redis connection closed');
});
exports.redis.on('reconnecting', () => {
    console.log('🔄 [Redis]: Reconnecting to Redis...');
});
/**
 * Create a separate Redis connection for BullMQ
 * BullMQ requires its own connection instance
 */
exports.redisConnection = new ioredis_1.default(redisConfig);
/**
 * Test Redis connection
 */
async function testRedisConnection() {
    try {
        await exports.redis.ping();
        console.log('🏓 [Redis]: Connection test successful');
        return true;
    }
    catch (error) {
        console.error('❌ [Redis]: Connection test failed:', error);
        return false;
    }
}
/**
 * Get Redis connection info
 */
async function getRedisInfo() {
    try {
        const info = await exports.redis.info();
        const keyCount = await exports.redis.dbsize();
        return {
            connected: exports.redis.status === 'ready',
            status: exports.redis.status,
            keyCount,
            memory: info.includes('used_memory:')
                ? info.split('used_memory:')[1]?.split('\r\n')[0]
                : 'unknown',
        };
    }
    catch (error) {
        console.error('Error getting Redis info:', error);
        return {
            connected: false,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Close Redis connections gracefully
 */
async function closeRedisConnections() {
    try {
        await exports.redis.quit();
        await exports.redisConnection.quit();
        console.log('👋 [Redis]: Connections closed gracefully');
    }
    catch (error) {
        console.error('Error closing Redis connections:', error);
    }
}
exports.default = exports.redis;
