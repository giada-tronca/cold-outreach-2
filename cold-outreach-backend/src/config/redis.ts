import Redis from 'ioredis';
import { envConfig } from './environment';

/**
 * Parse Redis URL to extract connection details
 */
function parseRedisUrl(url: string) {
  try {
    const redisUrl = new URL(url);
    return {
      host: redisUrl.hostname || 'localhost',
      port: redisUrl.port ? parseInt(redisUrl.port, 10) : 6379,
      password: redisUrl.password || undefined,
      db: redisUrl.pathname ? parseInt(redisUrl.pathname.slice(1), 10) || 0 : 0,
    };
  } catch {
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

const redisUrlParts = parseRedisUrl(envConfig.REDIS_URL);

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
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Connection events
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
};

/**
 * Create Redis connection instance
 */
export const redis = new Redis(redisConfig);

/**
 * Redis connection events
 */
redis.on('connect', () => {
  console.log('📡 [Redis]: Connected to Redis server');
});

redis.on('ready', () => {
  console.log('✅ [Redis]: Redis connection is ready');
});

redis.on('error', error => {
  console.error('❌ [Redis]: Redis connection error:', error);
});

redis.on('close', () => {
  console.log('🔌 [Redis]: Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 [Redis]: Reconnecting to Redis...');
});

/**
 * Create a separate Redis connection for BullMQ
 * BullMQ requires its own connection instance
 */
export const redisConnection = new Redis(redisConfig);

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    console.log('🏓 [Redis]: Connection test successful');
    return true;
  } catch (error) {
    console.error('❌ [Redis]: Connection test failed:', error);
    return false;
  }
}

/**
 * Get Redis connection info
 */
export async function getRedisInfo(): Promise<any> {
  try {
    const info = await redis.info();
    const keyCount = await redis.dbsize();

    return {
      connected: redis.status === 'ready',
      status: redis.status,
      keyCount,
      memory: info.includes('used_memory:')
        ? info.split('used_memory:')[1]?.split('\r\n')[0]
        : 'unknown',
    };
  } catch (error) {
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
export async function closeRedisConnections(): Promise<void> {
  try {
    await redis.quit();
    await redisConnection.quit();
    console.log('👋 [Redis]: Connections closed gracefully');
  } catch (error) {
    console.error('Error closing Redis connections:', error);
  }
}

export default redis;
