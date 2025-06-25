"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("@/utils/apiResponse");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Registration endpoint' }, 'User registration');
});
/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Login endpoint' }, 'User login');
});
/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Logout successful' }, 'User logged out');
});
/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'User profile endpoint' }, 'User profile');
});
exports.default = router;
