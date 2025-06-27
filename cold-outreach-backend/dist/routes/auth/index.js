"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const apiResponse_1 = require("@/utils/apiResponse");
const authController_1 = require("../../controllers/authController");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', (_req, res) => {
    apiResponse_1.ApiResponseBuilder.success(res, { message: 'Registration endpoint' }, 'User registration');
});
/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/login', authController_1.AuthController.login);
/**
 * @route   POST /api/auth/admin/login
 * @desc    Admin login
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/admin/login', authController_1.AuthController.adminLogin);
/**
 * @route   POST /api/auth/users
 * @desc    Create new user (Admin only)
 * @access  Private (Admin)
 * @body    { firstName: string, lastName: string, email: string, password: string, role?: UserRole }
 */
router.post('/users', authController_1.AuthController.createUser);
/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/profile', authController_1.AuthController.getProfile);
/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.post('/refresh', authController_1.AuthController.refreshToken);
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
