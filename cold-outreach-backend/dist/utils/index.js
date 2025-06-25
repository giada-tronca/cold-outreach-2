"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorDetails = exports.isOperationalError = exports.JobProcessingError = exports.ExternalServiceError = exports.DatabaseError = exports.TooManyRequestsError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.AppError = exports.calculatePagination = exports.ApiResponseBuilder = void 0;
// API Response utilities
var apiResponse_1 = require("./apiResponse");
Object.defineProperty(exports, "ApiResponseBuilder", { enumerable: true, get: function () { return apiResponse_1.ApiResponseBuilder; } });
Object.defineProperty(exports, "calculatePagination", { enumerable: true, get: function () { return apiResponse_1.calculatePagination; } });
// Error handling utilities
var errors_1 = require("./errors");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return errors_1.AppError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errors_1.NotFoundError; } });
Object.defineProperty(exports, "UnauthorizedError", { enumerable: true, get: function () { return errors_1.UnauthorizedError; } });
Object.defineProperty(exports, "ForbiddenError", { enumerable: true, get: function () { return errors_1.ForbiddenError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return errors_1.ConflictError; } });
Object.defineProperty(exports, "TooManyRequestsError", { enumerable: true, get: function () { return errors_1.TooManyRequestsError; } });
Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function () { return errors_1.DatabaseError; } });
Object.defineProperty(exports, "ExternalServiceError", { enumerable: true, get: function () { return errors_1.ExternalServiceError; } });
Object.defineProperty(exports, "JobProcessingError", { enumerable: true, get: function () { return errors_1.JobProcessingError; } });
Object.defineProperty(exports, "isOperationalError", { enumerable: true, get: function () { return errors_1.isOperationalError; } });
Object.defineProperty(exports, "getErrorDetails", { enumerable: true, get: function () { return errors_1.getErrorDetails; } });
