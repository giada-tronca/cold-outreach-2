"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploadRateLimit = exports.authRateLimit = exports.strictRateLimit = exports.rateLimitConfig = void 0;
exports.setupSecurity = setupSecurity;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errors_1 = require("@/utils/errors");
/**
 * Standard rate limiting configuration
 */
exports.rateLimitConfig = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        throw new errors_1.TooManyRequestsError('Rate limit exceeded');
    },
});
/**
 * Strict rate limiting for sensitive endpoints
 */
exports.strictRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many requests for this sensitive endpoint',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        throw new errors_1.TooManyRequestsError('Rate limit exceeded for sensitive endpoint');
    },
});
/**
 * Authentication rate limiting
 */
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth attempts per windowMs
    message: 'Too many authentication attempts',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
        throw new errors_1.TooManyRequestsError('Too many authentication attempts');
    },
});
/**
 * File upload rate limiting
 */
exports.fileUploadRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 file uploads per hour
    message: 'Too many file uploads',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        throw new errors_1.TooManyRequestsError('File upload rate limit exceeded');
    },
});
/**
 * Setup comprehensive security middleware
 */
function setupSecurity(app) {
    // CORS handling
    app.use((req, res, next) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:5173',
        ];
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
        next();
    });
}
