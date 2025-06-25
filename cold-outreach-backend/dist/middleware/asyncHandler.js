"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * Wraps an async request handler to catch any errors and pass them to the error handling middleware
 * @param fn The async request handler function to wrap
 * @returns A wrapped request handler that catches errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
exports.default = exports.asyncHandler;
