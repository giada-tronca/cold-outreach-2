import { Router } from 'express'
import { ApiResponseBuilder } from '@/utils/apiResponse'
import { AuthController } from '../../controllers/authController'

const router = Router()

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', (_req, res) => {
    ApiResponseBuilder.success(res, { message: 'Registration endpoint' }, 'User registration')
})

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/login', AuthController.login)

/**
 * @route   POST /api/auth/admin/login
 * @desc    Admin login
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/admin/login', AuthController.adminLogin)

/**
 * @route   POST /api/auth/users
 * @desc    Create new user (Admin only)
 * @access  Private (Admin)
 * @body    { firstName: string, lastName: string, email: string, password: string, role?: UserRole }
 */
router.post('/users', AuthController.createUser)

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/profile', AuthController.getProfile)

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.post('/refresh', AuthController.refreshToken)

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', (_req, res) => {
    ApiResponseBuilder.success(res, { message: 'Logout successful' }, 'User logged out')
})

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', (_req, res) => {
    ApiResponseBuilder.success(res, { message: 'User profile endpoint' }, 'User profile')
})

export default router 