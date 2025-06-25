"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobProcessingError = exports.ExternalServiceError = exports.DatabaseError = exports.TooManyRequestsError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.BadRequestError = exports.ValidationError = exports.AppError = void 0;
exports.isOperationalError = isOperationalError;
exports.getErrorDetails = getErrorDetails;
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(message, statusCode, isOperational, errors) {
        if (statusCode === void 0) { statusCode = 500; }
        if (isOperational === void 0) { isOperational = true; }
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.isOperational = isOperational;
        _this.timestamp = new Date().toISOString();
        if (errors) {
            _this.errors = errors;
        }
        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(_this, _this.constructor);
        return _this;
    }
    return AppError;
}(Error));
exports.AppError = AppError;
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message, errors) {
        if (message === void 0) { message = 'Validation failed'; }
        return _super.call(this, message, 422, true, errors) || this;
    }
    return ValidationError;
}(AppError));
exports.ValidationError = ValidationError;
var BadRequestError = /** @class */ (function (_super) {
    __extends(BadRequestError, _super);
    function BadRequestError(message) {
        if (message === void 0) { message = 'Bad request'; }
        return _super.call(this, message, 400, true) || this;
    }
    return BadRequestError;
}(AppError));
exports.BadRequestError = BadRequestError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message) {
        if (message === void 0) { message = 'Resource not found'; }
        return _super.call(this, message, 404, true) || this;
    }
    return NotFoundError;
}(AppError));
exports.NotFoundError = NotFoundError;
var UnauthorizedError = /** @class */ (function (_super) {
    __extends(UnauthorizedError, _super);
    function UnauthorizedError(message) {
        if (message === void 0) { message = 'Unauthorized'; }
        return _super.call(this, message, 401, true) || this;
    }
    return UnauthorizedError;
}(AppError));
exports.UnauthorizedError = UnauthorizedError;
var ForbiddenError = /** @class */ (function (_super) {
    __extends(ForbiddenError, _super);
    function ForbiddenError(message) {
        if (message === void 0) { message = 'Forbidden'; }
        return _super.call(this, message, 403, true) || this;
    }
    return ForbiddenError;
}(AppError));
exports.ForbiddenError = ForbiddenError;
var ConflictError = /** @class */ (function (_super) {
    __extends(ConflictError, _super);
    function ConflictError(message) {
        if (message === void 0) { message = 'Resource conflict'; }
        return _super.call(this, message, 409, true) || this;
    }
    return ConflictError;
}(AppError));
exports.ConflictError = ConflictError;
var TooManyRequestsError = /** @class */ (function (_super) {
    __extends(TooManyRequestsError, _super);
    function TooManyRequestsError(message) {
        if (message === void 0) { message = 'Too many requests'; }
        return _super.call(this, message, 429, true) || this;
    }
    return TooManyRequestsError;
}(AppError));
exports.TooManyRequestsError = TooManyRequestsError;
var DatabaseError = /** @class */ (function (_super) {
    __extends(DatabaseError, _super);
    function DatabaseError(message) {
        if (message === void 0) { message = 'Database operation failed'; }
        return _super.call(this, message, 500, true) || this;
    }
    return DatabaseError;
}(AppError));
exports.DatabaseError = DatabaseError;
var ExternalServiceError = /** @class */ (function (_super) {
    __extends(ExternalServiceError, _super);
    function ExternalServiceError(service, message) {
        if (message === void 0) { message = 'External service error'; }
        var _this = _super.call(this, message, 502, true) || this;
        _this.service = service;
        return _this;
    }
    return ExternalServiceError;
}(AppError));
exports.ExternalServiceError = ExternalServiceError;
var JobProcessingError = /** @class */ (function (_super) {
    __extends(JobProcessingError, _super);
    function JobProcessingError(message, jobId, jobType) {
        if (message === void 0) { message = 'Job processing failed'; }
        var _this = _super.call(this, message, 500, true) || this;
        if (jobId) {
            _this.jobId = jobId;
        }
        if (jobType) {
            _this.jobType = jobType;
        }
        return _this;
    }
    return JobProcessingError;
}(AppError));
exports.JobProcessingError = JobProcessingError;
/**
 * Utility function to check if an error is operational (safe to expose to client)
 */
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}
/**
 * Utility function to extract error details for logging
 */
function getErrorDetails(error) {
    var details = {
        message: error.message,
        stack: error.stack,
    };
    if (error instanceof AppError) {
        details.statusCode = error.statusCode;
        details.timestamp = error.timestamp;
        details.isOperational = error.isOperational;
        if (error.errors) {
            details.errors = error.errors;
        }
        // Add specific error details
        if (error instanceof ExternalServiceError) {
            details.service = error.service;
        }
        if (error instanceof JobProcessingError) {
            details.jobId = error.jobId;
            details.jobType = error.jobType;
        }
    }
    return details;
}
