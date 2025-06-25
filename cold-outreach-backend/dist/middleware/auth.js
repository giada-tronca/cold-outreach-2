"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
exports.requireOwnershipOrAdmin = requireOwnershipOrAdmin;
exports.optionalAuth = optionalAuth;
exports.generateToken = generateToken;
exports.verifyTokenSafe = verifyTokenSafe;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("@/utils/errors");
/**
 * Middleware to verify JWT token and authenticate user
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
        throw new errors_1.UnauthorizedError('Access token required');
    }
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Add user info to request
        req.user = {
            id: payload.userId,
            email: payload.email,
            ...(payload.role && { role: payload.role })
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new errors_1.UnauthorizedError('Invalid token');
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_1.UnauthorizedError('Token expired');
        }
        throw new errors_1.UnauthorizedError('Token verification failed');
    }
}
/**
 * Middleware to check if user has required role
 */
function requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return (req, res, next) => {
        if (!req.user) {
            throw new errors_1.UnauthorizedError('Authentication required');
        }
        const userRole = req.user.role || 'user';
        if (!roles.includes(userRole)) {
            throw new errors_1.ForbiddenError('Insufficient permissions');
        }
        next();
    };
}
/**
 * Middleware to check if user owns the resource or has admin role
 */
function requireOwnershipOrAdmin(userIdField = 'userId') {
    return (req, res, next) => {
        if (!req.user) {
            throw new errors_1.UnauthorizedError('Authentication required');
        }
        const resourceUserId = req.params[userIdField] || req.body[userIdField];
        const currentUserId = req.user.id;
        const userRole = req.user.role || 'user';
        // Allow if user owns the resource or is admin
        if (resourceUserId === currentUserId || userRole === 'admin') {
            next();
            return;
        }
        throw new errors_1.ForbiddenError('Access denied: insufficient permissions');
    };
}
/**
 * Optional authentication middleware (doesn't throw if no token)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
        // No token provided, continue without authentication
        next();
        return;
    }
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            next();
            return;
        }
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Add user info to request if token is valid
        req.user = {
            id: payload.userId,
            email: payload.email,
            ...(payload.role && { role: payload.role })
        };
        next();
    }
    catch (error) {
        // Invalid token, but don't throw error - just continue without auth
        next();
    }
}
/**
 * Utility function to generate JWT token
 * TODO: Fix JWT typing issue
 */
function generateToken(payload) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    // Temporary implementation - fix JWT types later
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn });
}
/**
 * Utility function to verify token without throwing
 */
function verifyTokenSafe(token) {
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return null;
        }
        return jsonwebtoken_1.default.verify(token, jwtSecret);
    }
    catch {
        return null;
    }
}
