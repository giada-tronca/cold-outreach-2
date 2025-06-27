import { Request, Response } from 'express';
import { AuthService, LoginCredentials, CreateUserData } from '../services/auth/authService';
import { UserRole } from '@prisma/client';

export interface LoginRequest extends Request {
    body: LoginCredentials;
}

export interface CreateUserRequest extends Request {
    body: CreateUserData;
}

export class AuthController {
    /**
     * User login endpoint
     * POST /api/auth/login
     */
    static async login(req: LoginRequest, res: Response): Promise<void> {
        try {
            const { email, password, rememberMe } = req.body;

            // Validate input
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Email and password are required',
                    errors: {
                        ...((!email) && { email: 'Email is required' }),
                        ...((!password) && { password: 'Password is required' })
                    }
                });
                return;
            }

            // Validate email format
            const emailValidation = AuthService.validateEmail(email);
            if (!emailValidation.isValid) {
                res.status(400).json({
                    success: false,
                    message: emailValidation.message,
                    errors: { email: emailValidation.message }
                });
                return;
            }

            // Validate password
            const passwordValidation = AuthService.validatePassword(password);
            if (!passwordValidation.isValid) {
                res.status(400).json({
                    success: false,
                    message: passwordValidation.message,
                    errors: { password: passwordValidation.message }
                });
                return;
            }

            // Authenticate user
            const authResult = await AuthService.authenticateUser({ email, password, rememberMe });

            if (!authResult.success) {
                res.status(401).json({
                    success: false,
                    message: authResult.message
                });
                return;
            }

            // Return success response
            res.status(200).json({
                success: true,
                message: authResult.message,
                data: {
                    user: {
                        id: authResult.user!.id,
                        firstName: authResult.user!.firstName,
                        lastName: authResult.user!.lastName,
                        email: authResult.user!.email,
                        role: authResult.user!.role
                    },
                    token: authResult.token
                }
            });

        } catch (error) {
            console.error('Login controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error. Please try again later.'
            });
        }
    }

    /**
     * Admin login endpoint
     * POST /api/auth/admin/login
     */
    static async adminLogin(req: LoginRequest, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Email and password are required',
                    errors: {
                        ...((!email) && { email: 'Email is required' }),
                        ...((!password) && { password: 'Password is required' })
                    }
                });
                return;
            }

            // Validate email format
            const emailValidation = AuthService.validateEmail(email);
            if (!emailValidation.isValid) {
                res.status(400).json({
                    success: false,
                    message: emailValidation.message,
                    errors: { email: emailValidation.message }
                });
                return;
            }

            // Validate password
            const passwordValidation = AuthService.validatePassword(password);
            if (!passwordValidation.isValid) {
                res.status(400).json({
                    success: false,
                    message: passwordValidation.message,
                    errors: { password: passwordValidation.message }
                });
                return;
            }

            // Authenticate admin
            const authResult = await AuthService.authenticateAdmin({ email, password });

            if (!authResult.success) {
                // Use 403 for access denied, 401 for invalid credentials
                const statusCode = authResult.message?.includes('Access denied') ? 403 : 401;
                res.status(statusCode).json({
                    success: false,
                    message: authResult.message
                });
                return;
            }

            // Return success response
            res.status(200).json({
                success: true,
                message: authResult.message,
                data: {
                    user: {
                        id: authResult.user!.id,
                        firstName: authResult.user!.firstName,
                        lastName: authResult.user!.lastName,
                        email: authResult.user!.email,
                        role: authResult.user!.role
                    },
                    token: authResult.token
                }
            });

        } catch (error) {
            console.error('Admin login controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error. Please try again later.'
            });
        }
    }

    /**
     * Create new user endpoint (Admin only)
     * POST /api/auth/users
     */
    static async createUser(req: CreateUserRequest, res: Response): Promise<void> {
        try {
            const { firstName, lastName, email, password, role } = req.body;

            // Validate required fields
            const errors: Record<string, string> = {};

            if (!firstName || firstName.trim().length === 0) {
                errors.firstName = 'First name is required';
            } else if (firstName.trim().length > 100) {
                errors.firstName = 'First name must be less than 100 characters';
            }

            if (!lastName || lastName.trim().length === 0) {
                errors.lastName = 'Last name is required';
            } else if (lastName.trim().length > 100) {
                errors.lastName = 'Last name must be less than 100 characters';
            }

            if (!email) {
                errors.email = 'Email is required';
            } else {
                const emailValidation = AuthService.validateEmail(email);
                if (!emailValidation.isValid) {
                    errors.email = emailValidation.message!;
                }
            }

            if (!password) {
                errors.password = 'Password is required';
            } else {
                const passwordValidation = AuthService.validatePassword(password);
                if (!passwordValidation.isValid) {
                    errors.password = passwordValidation.message!;
                }
            }

            // Validate role if provided
            if (role && !Object.values(UserRole).includes(role)) {
                errors.role = 'Invalid role specified';
            }

            // Return validation errors if any
            if (Object.keys(errors).length > 0) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
                return;
            }

            // Create user
            const createResult = await AuthService.createUser({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.toLowerCase().trim(),
                password,
                role: role || UserRole.USER
            });

            if (!createResult.success) {
                // Check if it's a duplicate email error
                const statusCode = createResult.message?.includes('already exists') ? 409 : 400;
                res.status(statusCode).json({
                    success: false,
                    message: createResult.message
                });
                return;
            }

            // Return success response (without password)
            res.status(201).json({
                success: true,
                message: createResult.message,
                data: {
                    user: {
                        id: createResult.user!.id,
                        firstName: createResult.user!.firstName,
                        lastName: createResult.user!.lastName,
                        email: createResult.user!.email,
                        role: createResult.user!.role,
                        isActive: createResult.user!.isActive
                    }
                }
            });

        } catch (error) {
            console.error('Create user controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error. Please try again later.'
            });
        }
    }

    /**
     * Get current user profile
     * GET /api/auth/profile
     */
    static async getProfile(req: Request, res: Response): Promise<void> {
        try {
            // This would typically get user from JWT middleware
            // For now, we'll implement basic functionality

            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    message: 'Authorization token required'
                });
                return;
            }

            const token = authHeader.substring(7);
            const user = AuthService.verifyToken(token);

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
                return;
            }

            // Get fresh user data from database
            const currentUser = await AuthService.getUserById(user.id);
            if (!currentUser) {
                res.status(404).json({
                    success: false,
                    message: 'User not found or inactive'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: currentUser.id,
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName,
                        email: currentUser.email,
                        role: currentUser.role,
                        isActive: currentUser.isActive
                    }
                }
            });

        } catch (error) {
            console.error('Get profile controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error. Please try again later.'
            });
        }
    }

    /**
     * Refresh token endpoint
     * POST /api/auth/refresh
     */
    static async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    message: 'Authorization token required'
                });
                return;
            }

            const token = authHeader.substring(7);
            const user = AuthService.verifyToken(token);

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
                return;
            }

            // Get fresh user data and generate new token
            const currentUser = await AuthService.getUserById(user.id);
            if (!currentUser) {
                res.status(404).json({
                    success: false,
                    message: 'User not found or inactive'
                });
                return;
            }

            const newToken = AuthService.generateToken(currentUser);

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    token: newToken,
                    user: {
                        id: currentUser.id,
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName,
                        email: currentUser.email,
                        role: currentUser.role
                    }
                }
            });

        } catch (error) {
            console.error('Refresh token controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error. Please try again later.'
            });
        }
    }
} 