import { Router } from 'express'
import { ApiResponseBuilder } from '@/utils/apiResponse'

const router = Router()

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', (_req, res) => {
    ApiResponseBuilder.success(res, { message: 'Registration endpoint' }, 'User registration')
})

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', (_req, res) => {
    ApiResponseBuilder.success(res, { message: 'Login endpoint' }, 'User login')
})

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