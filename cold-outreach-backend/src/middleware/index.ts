// Error handling middleware
export {
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  requestIdHandler,
} from './errorHandler';

// Authentication middleware
export {
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin,
  optionalAuth,
  generateToken,
  verifyTokenSafe,
} from './auth';

// Validation middleware
export {
  handleValidationErrors,
  validate,
  validatePagination,
  validateFileUpload,
  validateUuid,
  sanitizeBody,
  validateContentType,
} from './validation';

// Security middleware
export {
  rateLimitConfig,
  strictRateLimit,
  authRateLimit,
  fileUploadRateLimit,
  setupSecurity,
} from './security';
