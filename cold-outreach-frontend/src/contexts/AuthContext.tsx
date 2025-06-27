import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '@/services/authService';
import type { User } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user has valid token and user data
        const authenticated = AuthService.isAuthenticated();

        if (authenticated) {
          const storedUser = AuthService.getUser();
          if (storedUser) {
            // Verify token with backend
            try {
              const profileResult = await AuthService.getProfile();
              if (profileResult.success && profileResult.user) {
                setUser(profileResult.user);
                setIsAuthenticated(true);
              } else {
                // Token is invalid, clear auth data
                AuthService.logout();
                setUser(null);
                setIsAuthenticated(false);
              }
            } catch (error) {
              // If profile check fails, use stored user but log the error
              console.warn(
                'Profile verification failed, using stored user data:',
                error
              );
              setUser(storedUser);
              setIsAuthenticated(true);
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ) => {
    try {
      const result = await AuthService.login({ email, password, rememberMe });

      if (result.success && result.data) {
        setUser(result.data.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return {
          success: false,
          message: result.message || 'Login failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshAuth = async () => {
    try {
      if (isAuthenticated) {
        const profileResult = await AuthService.getProfile();
        if (profileResult.success && profileResult.user) {
          setUser(profileResult.user);
        }
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
