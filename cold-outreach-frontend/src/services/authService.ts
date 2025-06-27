import { apiClient, handleApiResponse } from './api';

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
  role?: 'USER' | 'ADMIN';
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
  };
  errors?: Record<string, string>;
}

export interface CreateUserResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
  };
  errors?: Record<string, string>;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'cold_outreach_auth_token';
  private static readonly USER_KEY = 'cold_outreach_user';
  private static readonly REMEMBER_ME_KEY = 'cold_outreach_remember_me';

  /**
   * User login
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/api/auth/login', credentials);
      const data = await handleApiResponse(response);

      if (data.success && data.data) {
        // Store token and user data with rememberMe setting
        this.setToken(data.data.token, credentials.rememberMe || false);
        this.setUser(data.data.user, credentials.rememberMe || false);
      }

      return data;
    } catch (error: any) {
      if (error.responseData) {
        return error.responseData;
      }

      return {
        success: false,
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Admin login
   */
  static async adminLogin(
    credentials: LoginCredentials
  ): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(
        '/api/auth/admin/login',
        credentials
      );
      const data = await handleApiResponse(response);

      if (data.success && data.data) {
        // Store token and user data (admin login doesn't use rememberMe)
        this.setToken(data.data.token, false);
        this.setUser(data.data.user, false);
      }

      return data;
    } catch (error: any) {
      if (error.responseData) {
        return error.responseData;
      }

      return {
        success: false,
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Create new user (Admin only)
   */
  static async createUser(
    userData: CreateUserData
  ): Promise<CreateUserResponse> {
    try {
      const response = await apiClient.post('/api/auth/users', userData, {
        headers: this.getAuthHeader(),
      });
      const data = await handleApiResponse(response);
      return data;
    } catch (error: any) {
      if (error.responseData) {
        return error.responseData;
      }

      return {
        success: false,
        message:
          error.message ||
          'Network error. Please check your connection and try again.',
      };
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<{
    success: boolean;
    user?: User;
    message?: string;
  }> {
    try {
      const response = await apiClient.get('/api/auth/profile', {
        headers: this.getAuthHeader(),
      });
      const data = await handleApiResponse(response);

      if (data.success && data.data) {
        // Update stored user data (keep existing rememberMe setting)
        const wasRemembered =
          localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
        this.setUser(data.data.user, wasRemembered);
        return {
          success: true,
          user: data.data.user,
        };
      }

      return data;
    } catch (error: any) {
      if (error.responseData) {
        return error.responseData;
      }

      return {
        success: false,
        message: error.message || 'Failed to get user profile',
      };
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(
        '/api/auth/refresh',
        {},
        {
          headers: this.getAuthHeader(),
        }
      );
      const data = await handleApiResponse(response);

      if (data.success && data.data) {
        // Update token and user data (keep existing rememberMe setting)
        const wasRemembered =
          localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
        this.setToken(data.data.token, wasRemembered);
        this.setUser(data.data.user, wasRemembered);
      }

      return data;
    } catch (error: any) {
      if (error.responseData) {
        return error.responseData;
      }

      return {
        success: false,
        message: error.message || 'Failed to refresh token',
      };
    }
  }

  /**
   * Logout user
   */
  static logout(): void {
    // Clear from both storages
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);

    // Note: Authorization headers will be handled per request
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  /**
   * Check if user is admin
   */
  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  }

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    try {
      // Check sessionStorage first (session-only), then localStorage (persistent)
      return (
        sessionStorage.getItem(this.TOKEN_KEY) ||
        localStorage.getItem(this.TOKEN_KEY)
      );
    } catch {
      return null;
    }
  }

  /**
   * Set authentication token
   */
  static setToken(token: string, rememberMe: boolean = false): void {
    try {
      if (rememberMe) {
        // Store in localStorage for persistent storage (7 days)
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.REMEMBER_ME_KEY, 'true');
      } else {
        // Store in sessionStorage for session-only storage
        sessionStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.REMEMBER_ME_KEY, 'false');
      }
    } catch (error) {
      console.error('Failed to store auth token:', error);
    }
  }

  /**
   * Get stored user data
   */
  static getUser(): User | null {
    try {
      // Check sessionStorage first (session-only), then localStorage (persistent)
      const userJson =
        sessionStorage.getItem(this.USER_KEY) ||
        localStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set user data
   */
  static setUser(user: User, rememberMe: boolean = false): void {
    try {
      if (rememberMe) {
        // Store in localStorage for persistent storage
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      } else {
        // Store in sessionStorage for session-only storage
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  /**
   * Initialize authentication state
   * Call this when the app starts
   */
  static initialize(): void {
    const token = this.getToken();
    if (token) {
      // Note: We'll need to implement auth header setting in the apiClient
      console.log('Auth token found, should set authorization header');
    }
  }

  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; message?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Please enter a valid email address',
      };
    }

    if (email.length > 255) {
      return {
        isValid: false,
        message: 'Email address is too long',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    message?: string;
  } {
    if (!password || password.length < 6) {
      return {
        isValid: false,
        message: 'Password must be at least 6 characters long',
      };
    }

    if (password.length > 128) {
      return {
        isValid: false,
        message: 'Password must be less than 128 characters',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate name (first name or last name)
   */
  static validateName(
    name: string,
    fieldName: string = 'Name'
  ): { isValid: boolean; message?: string } {
    if (!name || name.trim().length === 0) {
      return {
        isValid: false,
        message: `${fieldName} is required`,
      };
    }

    if (name.trim().length > 100) {
      return {
        isValid: false,
        message: `${fieldName} must be less than 100 characters`,
      };
    }

    return { isValid: true };
  }
}
