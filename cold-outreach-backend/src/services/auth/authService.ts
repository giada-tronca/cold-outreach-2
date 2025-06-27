import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface CreateUserData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: UserRole;
}

export interface AuthenticatedUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
}

export interface AuthResponse {
    success: boolean;
    user?: AuthenticatedUser;
    token?: string;
    message?: string;
}

export class AuthService {
    private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    // JWT expiration time - currently using default from jsonwebtoken
    // private static readonly JWT_EXPIRES_IN = '24h';
    private static readonly SALT_ROUNDS = 12;

    /**
     * Hash a password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }

    /**
     * Compare a plain password with a hashed password
     */
    static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }

    /**
     * Generate a JWT token for a user
     */
    static generateToken(user: AuthenticatedUser, rememberMe: boolean = false): string {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        };

        // Set expiration based on rememberMe flag
        const expiresIn = rememberMe ? '7d' : '24h';

        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn,
            issuer: 'cold-outreach-api',
            audience: 'cold-outreach-app'
        });
    }

    /**
     * Verify and decode a JWT token
     */
    static verifyToken(token: string): AuthenticatedUser | null {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as any;
            return {
                id: decoded.id,
                firstName: decoded.firstName,
                lastName: decoded.lastName,
                email: decoded.email,
                role: decoded.role,
                isActive: true // We'll validate this from DB if needed
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Authenticate a user with email and password
     */
    static async authenticateUser(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            // Find user by email
            const user = await prisma.cOUsers.findUnique({
                where: { email: credentials.email.toLowerCase().trim() }
            });

            // Check if user exists
            if (!user) {
                return {
                    success: false,
                    message: 'No account found with this email address'
                };
            }

            // Check if user is active
            if (!user.isActive) {
                return {
                    success: false,
                    message: 'Your account has been deactivated. Please contact support.'
                };
            }

            // Verify password
            const isPasswordValid = await this.comparePassword(credentials.password, user.password);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: 'Invalid password. Please check your password and try again.'
                };
            }

            // Update last login timestamp
            await prisma.cOUsers.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });

            // Create authenticated user object
            const authenticatedUser: AuthenticatedUser = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            };

            // Generate JWT token with rememberMe setting
            const token = this.generateToken(authenticatedUser, credentials.rememberMe || false);

            return {
                success: true,
                user: authenticatedUser,
                token,
                message: 'Login successful'
            };

        } catch (error) {
            console.error('Authentication error:', error);
            return {
                success: false,
                message: 'An error occurred during authentication. Please try again.'
            };
        }
    }

    /**
     * Authenticate an admin user
     */
    static async authenticateAdmin(credentials: LoginCredentials): Promise<AuthResponse> {
        const authResult = await this.authenticateUser(credentials);

        if (!authResult.success) {
            return authResult;
        }

        // Check if user has admin role
        if (authResult.user?.role !== UserRole.ADMIN) {
            return {
                success: false,
                message: 'Access denied. Admin privileges required.'
            };
        }

        return authResult;
    }

    /**
     * Create a new user
     */
    static async createUser(userData: CreateUserData): Promise<AuthResponse> {
        try {
            // Check if user already exists
            const existingUser = await prisma.cOUsers.findUnique({
                where: { email: userData.email.toLowerCase().trim() }
            });

            if (existingUser) {
                return {
                    success: false,
                    message: 'An account with this email address already exists'
                };
            }

            // Hash password
            const hashedPassword = await this.hashPassword(userData.password);

            // Create user
            const newUser = await prisma.cOUsers.create({
                data: {
                    firstName: userData.firstName.trim(),
                    lastName: userData.lastName.trim(),
                    email: userData.email.toLowerCase().trim(),
                    password: hashedPassword,
                    role: userData.role || UserRole.USER
                }
            });

            // Create authenticated user object
            const authenticatedUser: AuthenticatedUser = {
                id: newUser.id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                role: newUser.role,
                isActive: newUser.isActive
            };

            return {
                success: true,
                user: authenticatedUser,
                message: 'User created successfully'
            };

        } catch (error) {
            console.error('User creation error:', error);
            return {
                success: false,
                message: 'An error occurred while creating the user. Please try again.'
            };
        }
    }

    /**
     * Get user by ID
     */
    static async getUserById(id: number): Promise<AuthenticatedUser | null> {
        try {
            const user = await prisma.cOUsers.findUnique({
                where: { id }
            });

            if (!user || !user.isActive) {
                return null;
            }

            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            };
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    /**
     * Validate password strength
     */
    static validatePassword(password: string): { isValid: boolean; message?: string } {
        if (!password || password.length < 6) {
            return {
                isValid: false,
                message: 'Password must be at least 6 characters long'
            };
        }

        if (password.length > 128) {
            return {
                isValid: false,
                message: 'Password must be less than 128 characters'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate email format
     */
    static validateEmail(email: string): { isValid: boolean; message?: string } {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            return {
                isValid: false,
                message: 'Please enter a valid email address'
            };
        }

        if (email.length > 255) {
            return {
                isValid: false,
                message: 'Email address is too long'
            };
        }

        return { isValid: true };
    }
} 