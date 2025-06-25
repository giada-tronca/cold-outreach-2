"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logConfigurationSummary = exports.getRateLimitConfig = exports.getCORSConfig = exports.getJWTConfig = exports.getRedisConfig = exports.getDatabaseConfig = exports.envConfig = exports.isTest = exports.isProduction = exports.isDevelopment = void 0;
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = path_1.default.resolve(process.cwd(), `.env.${nodeEnv}`);
// Load environment variables
(0, dotenv_1.config)({ path: envPath });
(0, dotenv_1.config)(); // Also load default .env
// Parse environment variables with defaults
const getEnvConfig = () => {
    const config = {
        // Server Configuration
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT || '3001', 10),
        HOST: process.env.HOST || 'localhost',
        // Database Configuration
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/cold_outreach',
        ...(process.env.DATABASE_POOL_SIZE && {
            DATABASE_POOL_SIZE: parseInt(process.env.DATABASE_POOL_SIZE, 10),
        }),
        ...(process.env.DATABASE_CONNECTION_TIMEOUT && {
            DATABASE_CONNECTION_TIMEOUT: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10),
        }),
        // Redis Configuration
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        ...(process.env.REDIS_CONNECTION_POOL_SIZE && {
            REDIS_CONNECTION_POOL_SIZE: parseInt(process.env.REDIS_CONNECTION_POOL_SIZE, 10),
        }),
        // JWT Configuration
        JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
        // Logging Configuration
        LOG_LEVEL: process.env.LOG_LEVEL || 'info',
        LOG_SQL_QUERIES: process.env.LOG_SQL_QUERIES === 'true',
        // File Upload Configuration
        MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
        ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'text/csv').split(','),
        // Rate Limiting Configuration
        RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
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
        API_KEYS_SOURCE: process.env.API_KEYS_SOURCE || 'database',
        // Health Check Configuration
        HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
    };
    return config;
};
// Validate required environment variables
const validateEnvironmentConfig = (config) => {
    const requiredVars = [
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_SECRET',
    ];
    const missingVars = requiredVars.filter(varName => {
        const value = config[varName];
        return !value || (typeof value === 'string' && value.trim() === '');
    });
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}\n` +
            `Please check your .env file or environment configuration.`);
    }
    // Validate JWT secret in production
    if (config.NODE_ENV === 'production') {
        if (config.JWT_SECRET === 'fallback-secret-change-in-production' ||
            config.JWT_SECRET.length < 32) {
            throw new Error('JWT_SECRET must be a strong secret (at least 32 characters) in production');
        }
    }
};
// Environment-specific configurations
const isDevelopment = () => exports.envConfig.NODE_ENV === 'development';
exports.isDevelopment = isDevelopment;
const isProduction = () => exports.envConfig.NODE_ENV === 'production';
exports.isProduction = isProduction;
const isTest = () => exports.envConfig.NODE_ENV === 'test';
exports.isTest = isTest;
// Get the environment configuration
exports.envConfig = getEnvConfig();
// Validate configuration
validateEnvironmentConfig(exports.envConfig);
// Export configuration
exports.default = exports.envConfig;
// Helper functions for common configurations
const getDatabaseConfig = () => ({
    url: exports.envConfig.DATABASE_URL,
    poolSize: exports.envConfig.DATABASE_POOL_SIZE,
    connectionTimeout: exports.envConfig.DATABASE_CONNECTION_TIMEOUT,
});
exports.getDatabaseConfig = getDatabaseConfig;
const getRedisConfig = () => ({
    url: exports.envConfig.REDIS_URL,
    poolSize: exports.envConfig.REDIS_CONNECTION_POOL_SIZE,
});
exports.getRedisConfig = getRedisConfig;
const getJWTConfig = () => ({
    secret: exports.envConfig.JWT_SECRET,
    expiresIn: exports.envConfig.JWT_EXPIRES_IN,
});
exports.getJWTConfig = getJWTConfig;
const getCORSConfig = () => ({
    origin: (0, exports.isDevelopment)()
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
exports.getCORSConfig = getCORSConfig;
const getRateLimitConfig = () => ({
    windowMs: exports.envConfig.RATE_LIMIT_WINDOW_MS,
    max: exports.envConfig.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
});
exports.getRateLimitConfig = getRateLimitConfig;
// Log configuration summary (without sensitive data)
const logConfigurationSummary = (logger) => {
    logger.info('🚀 Application Configuration:', {
        environment: exports.envConfig.NODE_ENV,
        port: exports.envConfig.PORT,
        host: exports.envConfig.HOST,
        databaseConfigured: !!exports.envConfig.DATABASE_URL,
        redisConfigured: !!exports.envConfig.REDIS_URL,
        apiKeysSource: exports.envConfig.API_KEYS_SOURCE,
        corsEnabled: exports.envConfig.ENABLE_CORS,
        loggingLevel: exports.envConfig.LOG_LEVEL,
        sqlLogging: exports.envConfig.LOG_SQL_QUERIES,
    });
};
exports.logConfigurationSummary = logConfigurationSummary;
