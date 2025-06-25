import { config } from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);

// Load environment variables
config({ path: envPath });
config(); // Also load default .env

// Environment configuration interface
export interface EnvironmentConfig {
  // Server Configuration
  NODE_ENV: string;
  PORT: number;
  HOST: string;

  // Database Configuration
  DATABASE_URL: string;
  DATABASE_POOL_SIZE?: number;
  DATABASE_CONNECTION_TIMEOUT?: number;

  // Redis Configuration
  REDIS_URL: string;
  REDIS_CONNECTION_POOL_SIZE?: number;

  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Logging Configuration
  LOG_LEVEL: string;
  LOG_SQL_QUERIES: boolean;

  // File Upload Configuration
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string[];

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // Email Configuration
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;

  // Feature Flags
  ENABLE_CORS: boolean;
  ENABLE_REQUEST_LOGGING: boolean;
  ENABLE_ERROR_DETAILS: boolean;
  ENABLE_DB_SEEDING: boolean;
  SEED_SAMPLE_DATA: boolean;

  // Security Configuration
  TRUST_PROXY?: boolean;
  SECURE_COOKIES?: boolean;
  HTTPS_ONLY?: boolean;

  // API Configuration
  API_KEYS_SOURCE: 'database' | 'environment';

  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT: number;
}

// Parse environment variables with defaults
const getEnvConfig = (): EnvironmentConfig => {
  const config: EnvironmentConfig = {
    // Server Configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    HOST: process.env.HOST || 'localhost',

    // Database Configuration
    DATABASE_URL:
      process.env.DATABASE_URL || 'postgresql://localhost:5432/cold_outreach',
    ...(process.env.DATABASE_POOL_SIZE && {
      DATABASE_POOL_SIZE: parseInt(process.env.DATABASE_POOL_SIZE, 10),
    }),
    ...(process.env.DATABASE_CONNECTION_TIMEOUT && {
      DATABASE_CONNECTION_TIMEOUT: parseInt(
        process.env.DATABASE_CONNECTION_TIMEOUT,
        10
      ),
    }),

    // Redis Configuration
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    ...(process.env.REDIS_CONNECTION_POOL_SIZE && {
      REDIS_CONNECTION_POOL_SIZE: parseInt(
        process.env.REDIS_CONNECTION_POOL_SIZE,
        10
      ),
    }),

    // JWT Configuration
    JWT_SECRET:
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

    // Logging Configuration
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_SQL_QUERIES: process.env.LOG_SQL_QUERIES === 'true',

    // File Upload Configuration
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'text/csv').split(
      ','
    ),

    // Rate Limiting Configuration
    RATE_LIMIT_WINDOW_MS: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || '900000',
      10
    ),
    RATE_LIMIT_MAX_REQUESTS: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      10
    ),

    // Email Configuration
    ...(process.env.SMTP_HOST && { SMTP_HOST: process.env.SMTP_HOST }),
    ...(process.env.SMTP_PORT && {
      SMTP_PORT: parseInt(process.env.SMTP_PORT, 10),
    }),
    ...(process.env.SMTP_USER && { SMTP_USER: process.env.SMTP_USER }),
    ...(process.env.SMTP_PASS && { SMTP_PASS: process.env.SMTP_PASS }),

    // Feature Flags
    ENABLE_CORS: process.env.ENABLE_CORS !== 'false',
    ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    ENABLE_ERROR_DETAILS: process.env.ENABLE_ERROR_DETAILS === 'true',
    ENABLE_DB_SEEDING: process.env.ENABLE_DB_SEEDING === 'true',
    SEED_SAMPLE_DATA: process.env.SEED_SAMPLE_DATA === 'true',

    // Security Configuration
    ...(process.env.TRUST_PROXY && {
      TRUST_PROXY: process.env.TRUST_PROXY === 'true',
    }),
    ...(process.env.SECURE_COOKIES && {
      SECURE_COOKIES: process.env.SECURE_COOKIES === 'true',
    }),
    ...(process.env.HTTPS_ONLY && {
      HTTPS_ONLY: process.env.HTTPS_ONLY === 'true',
    }),

    // API Configuration
    API_KEYS_SOURCE:
      (process.env.API_KEYS_SOURCE as 'database' | 'environment') || 'database',

    // Health Check Configuration
    HEALTH_CHECK_TIMEOUT: parseInt(
      process.env.HEALTH_CHECK_TIMEOUT || '5000',
      10
    ),
  };

  return config;
};

// Validate required environment variables
const validateEnvironmentConfig = (config: EnvironmentConfig): void => {
  const requiredVars: (keyof EnvironmentConfig)[] = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = config[varName];
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        `Please check your .env file or environment configuration.`
    );
  }

  // Validate JWT secret in production
  if (config.NODE_ENV === 'production') {
    if (
      config.JWT_SECRET === 'fallback-secret-change-in-production' ||
      config.JWT_SECRET.length < 32
    ) {
      throw new Error(
        'JWT_SECRET must be a strong secret (at least 32 characters) in production'
      );
    }
  }
};

// Environment-specific configurations
export const isDevelopment = (): boolean =>
  envConfig.NODE_ENV === 'development';
export const isProduction = (): boolean => envConfig.NODE_ENV === 'production';
export const isTest = (): boolean => envConfig.NODE_ENV === 'test';

// Get the environment configuration
export const envConfig = getEnvConfig();

// Validate configuration
validateEnvironmentConfig(envConfig);

// Export configuration
export default envConfig;

// Helper functions for common configurations
export const getDatabaseConfig = () => ({
  url: envConfig.DATABASE_URL,
  poolSize: envConfig.DATABASE_POOL_SIZE,
  connectionTimeout: envConfig.DATABASE_CONNECTION_TIMEOUT,
});

export const getRedisConfig = () => ({
  url: envConfig.REDIS_URL,
  poolSize: envConfig.REDIS_CONNECTION_POOL_SIZE,
});

export const getJWTConfig = () => ({
  secret: envConfig.JWT_SECRET,
  expiresIn: envConfig.JWT_EXPIRES_IN,
});

export const getCORSConfig = () => ({
  origin: isDevelopment()
    ? [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
      ]
    : process.env.FRONTEND_URL?.split(',') || false,
  credentials: true,
});

export const getRateLimitConfig = () => ({
  windowMs: envConfig.RATE_LIMIT_WINDOW_MS,
  max: envConfig.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});

// Log configuration summary (without sensitive data)
export const logConfigurationSummary = (logger: any) => {
  logger.info('🚀 Application Configuration:', {
    environment: envConfig.NODE_ENV,
    port: envConfig.PORT,
    host: envConfig.HOST,
    databaseConfigured: !!envConfig.DATABASE_URL,
    redisConfigured: !!envConfig.REDIS_URL,
    apiKeysSource: envConfig.API_KEYS_SOURCE,
    corsEnabled: envConfig.ENABLE_CORS,
    loggingLevel: envConfig.LOG_LEVEL,
    sqlLogging: envConfig.LOG_SQL_QUERIES,
  });
};
