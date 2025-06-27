import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthService } from '@/services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user has valid token and user data
        const authenticated = AuthService.isAuthenticated();
        const admin = AuthService.isAdmin();

        if (authenticated) {
          // Optionally verify token with backend
          try {
            const profileResult = await AuthService.getProfile();
            if (profileResult.success) {
              setIsAuthenticated(true);
              setIsAdmin(admin);
            } else {
              // Token is invalid, clear auth data
              AuthService.logout();
              setIsAuthenticated(false);
              setIsAdmin(false);
            }
          } catch (error) {
            // If profile check fails, assume token is invalid
            AuthService.logout();
            setIsAuthenticated(false);
            setIsAdmin(false);
          }
        } else {
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='flex items-center gap-3'>
          <div className='w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin'></div>
          <span className='text-muted-foreground'>
            Checking authentication...
          </span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  // Redirect to dashboard if admin access required but user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to='/cold-outreach/dashboard' replace />;
  }

  // Render protected content
  return <>{children}</>;
}

export default ProtectedRoute;
