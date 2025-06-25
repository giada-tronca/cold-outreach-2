"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSecurity = exports.fileUploadRateLimit = exports.authRateLimit = exports.strictRateLimit = exports.rateLimitConfig = exports.validateContentType = exports.sanitizeBody = exports.validateUuid = exports.validateFileUpload = exports.validatePagination = exports.validate = exports.handleValidationErrors = exports.verifyTokenSafe = exports.generateToken = exports.optionalAuth = exports.requireOwnershipOrAdmin = exports.requireRole = exports.authenticateToken = exports.requestIdHandler = exports.notFoundHandler = exports.asyncHandler = exports.globalErrorHandler = void 0;
// Error handling middleware
var errorHandler_1 = require("./errorHandler");
Object.defineProperty(exports, "globalErrorHandler", { enumerable: true, get: function () { return errorHandler_1.globalErrorHandler; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return errorHandler_1.asyncHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return errorHandler_1.notFoundHandler; } });
Object.defineProperty(exports, "requestIdHandler", { enumerable: true, get: function () { return errorHandler_1.requestIdHandler; } });
// Authentication middleware
var auth_1 = require("./auth");
Object.defineProperty(exports, "authenticateToken", { enumerable: true, get: function () { return auth_1.authenticateToken; } });
Object.defineProperty(exports, "requireRole", { enumerable: true, get: function () { return auth_1.requireRole; } });
Object.defineProperty(exports, "requireOwnershipOrAdmin", { enumerable: true, get: function () { return auth_1.requireOwnershipOrAdmin; } });
Object.defineProperty(exports, "optionalAuth", { enumerable: true, get: function () { return auth_1.optionalAuth; } });
Object.defineProperty(exports, "generateToken", { enumerable: true, get: function () { return auth_1.generateToken; } });
Object.defineProperty(exports, "verifyTokenSafe", { enumerable: true, get: function () { return auth_1.verifyTokenSafe; } });
// Validation middleware
var validation_1 = require("./validation");
Object.defineProperty(exports, "handleValidationErrors", { enumerable: true, get: function () { return validation_1.handleValidationErrors; } });
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return validation_1.validate; } });
Object.defineProperty(exports, "validatePagination", { enumerable: true, get: function () { return validation_1.validatePagination; } });
Object.defineProperty(exports, "validateFileUpload", { enumerable: true, get: function () { return validation_1.validateFileUpload; } });
Object.defineProperty(exports, "validateUuid", { enumerable: true, get: function () { return validation_1.validateUuid; } });
Object.defineProperty(exports, "sanitizeBody", { enumerable: true, get: function () { return validation_1.sanitizeBody; } });
Object.defineProperty(exports, "validateContentType", { enumerable: true, get: function () { return validation_1.validateContentType; } });
// Security middleware
var security_1 = require("./security");
Object.defineProperty(exports, "rateLimitConfig", { enumerable: true, get: function () { return security_1.rateLimitConfig; } });
Object.defineProperty(exports, "strictRateLimit", { enumerable: true, get: function () { return security_1.strictRateLimit; } });
Object.defineProperty(exports, "authRateLimit", { enumerable: true, get: function () { return security_1.authRateLimit; } });
Object.defineProperty(exports, "fileUploadRateLimit", { enumerable: true, get: function () { return security_1.fileUploadRateLimit; } });
Object.defineProperty(exports, "setupSecurity", { enumerable: true, get: function () { return security_1.setupSecurity; } });
