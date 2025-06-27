import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Tooltip imports removed - not currently used
import {
  Zap,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthService } from '@/services/authService';

interface FormErrors {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  general?: string;
}

export default function AddUser() {
  const navigate = useNavigate();

  // Add user form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [userCreated, setUserCreated] = useState(false);

  // Error states
  const [errors, setErrors] = useState<FormErrors>({});

  const validateUserForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!userEmail) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(userEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!userPassword) {
      newErrors.password = 'Password is required';
    } else if (userPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUserForm()) return;

    setIsUserLoading(true);
    setErrors({});

    try {
      // Use AuthService to create new user
      const result = await AuthService.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: userEmail,
        password: userPassword,
        role: 'USER',
      });

      if (result.success) {
        // Reset form after successful user creation
        setFirstName('');
        setLastName('');
        setUserEmail('');
        setUserPassword('');
        setUserCreated(true);

        // Hide success message after 3 seconds
        setTimeout(() => {
          setUserCreated(false);
        }, 3000);
      } else {
        // Handle user creation errors
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setErrors({ general: result.message || 'Failed to add user' });
        }
      }
    } catch (error) {
      console.error('Add user error:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsUserLoading(false);
    }
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
    if (errors.firstName) {
      const { firstName, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
    if (errors.lastName) {
      const { lastName, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleUserEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value);
    if (errors.email) {
      const { email, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleUserPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserPassword(e.target.value);
    if (errors.password) {
      const { password, ...rest } = errors;
      setErrors(rest);
    }
  };

  return (
    <>
      {/* Add custom CSS for floating animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                    @keyframes float {
                        0%, 100% {
                            transform: translateY(0px) translateX(0px);
                        }
                        25% {
                            transform: translateY(-20px) translateX(10px);
                        }
                        50% {
                            transform: translateY(-10px) translateX(-15px);
                        }
                        75% {
                            transform: translateY(-30px) translateX(5px);
                        }
                    }
                `,
        }}
      />

      <div className='min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden'>
        {/* Animated background elements */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div
            className='absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full animate-pulse'
            style={{
              animation: 'float 20s ease-in-out infinite',
              animationDelay: '0s',
            }}
          ></div>
          <div
            className='absolute -bottom-40 -right-40 w-96 h-96 bg-primary/3 rounded-full animate-pulse'
            style={{
              animation: 'float 25s ease-in-out infinite reverse',
              animationDelay: '5s',
            }}
          ></div>
          <div
            className='absolute top-1/4 right-1/4 w-64 h-64 bg-accent/20 rounded-full animate-pulse'
            style={{
              animation: 'float 30s ease-in-out infinite',
              animationDelay: '10s',
            }}
          ></div>
          <div
            className='absolute bottom-1/4 left-1/4 w-48 h-48 bg-primary/4 rounded-full animate-pulse'
            style={{
              animation: 'float 22s ease-in-out infinite reverse',
              animationDelay: '15s',
            }}
          ></div>
        </div>

        {/* Main container - centered */}
        <div className='relative w-full max-w-md mx-auto'>
          <div className='bg-card rounded-2xl shadow-2xl border border-border p-8 relative overflow-hidden backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700'>
            {/* Card decorative elements */}
            <div className='absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full'></div>
            <div className='absolute -bottom-20 -left-20 w-40 h-40 bg-accent/10 rounded-full'></div>

            <div className='relative'>
              {/* Logo */}
              <div className='flex items-center gap-3 mb-8 animate-in fade-in-0 slide-in-from-top-2 duration-500 delay-200'>
                <div className='flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-lg transition-transform hover:scale-105'>
                  <Zap className='h-5 w-5' />
                </div>
                <span className='font-semibold text-xl text-foreground'>
                  Cold Outreach AI
                </span>
              </div>

              {/* Add User Form */}
              <div className='space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-300'>
                <div>
                  <h3 className='text-2xl font-bold text-foreground mb-2'>
                    Add New User
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Create a new user account for the system
                  </p>
                </div>

                {/* Success message */}
                {userCreated && (
                  <div className='flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm animate-in fade-in-0 slide-in-from-top-1 duration-300'>
                    <CheckCircle className='h-4 w-4 flex-shrink-0' />
                    <span>User created successfully!</span>
                  </div>
                )}

                {/* General error message */}
                {errors.general && (
                  <div className='flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm animate-in fade-in-0 slide-in-from-top-1 duration-300'>
                    <AlertCircle className='h-4 w-4 flex-shrink-0' />
                    <span>{errors.general}</span>
                  </div>
                )}

                <form onSubmit={handleAddUser} className='space-y-4'>
                  {/* First Name field */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='firstName'
                      className='text-sm font-medium text-foreground'
                    >
                      First Name
                    </Label>
                    <Input
                      id='firstName'
                      type='text'
                      placeholder='Enter first name'
                      value={firstName}
                      onChange={handleFirstNameChange}
                      className={cn(
                        'h-12 px-4 bg-background border transition-all duration-200 hover:border-primary/50 focus:border-primary cursor-text',
                        errors.firstName &&
                          'border-destructive focus:border-destructive'
                      )}
                      required
                    />
                    {errors.firstName && (
                      <p className='text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-200'>
                        <AlertCircle className='h-3 w-3' />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name field */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='lastName'
                      className='text-sm font-medium text-foreground'
                    >
                      Last Name
                    </Label>
                    <Input
                      id='lastName'
                      type='text'
                      placeholder='Enter last name'
                      value={lastName}
                      onChange={handleLastNameChange}
                      className={cn(
                        'h-12 px-4 bg-background border transition-all duration-200 hover:border-primary/50 focus:border-primary cursor-text',
                        errors.lastName &&
                          'border-destructive focus:border-destructive'
                      )}
                      required
                    />
                    {errors.lastName && (
                      <p className='text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-200'>
                        <AlertCircle className='h-3 w-3' />
                        {errors.lastName}
                      </p>
                    )}
                  </div>

                  {/* Email field */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='userEmail'
                      className='text-sm font-medium text-foreground'
                    >
                      Email Address
                    </Label>
                    <Input
                      id='userEmail'
                      type='email'
                      placeholder='user@example.com'
                      value={userEmail}
                      onChange={handleUserEmailChange}
                      className={cn(
                        'h-12 px-4 bg-background border transition-all duration-200 hover:border-primary/50 focus:border-primary cursor-text',
                        errors.email &&
                          'border-destructive focus:border-destructive'
                      )}
                      required
                    />
                    {errors.email && (
                      <p className='text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-200'>
                        <AlertCircle className='h-3 w-3' />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password field */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='userPassword'
                      className='text-sm font-medium text-foreground'
                    >
                      Password
                    </Label>
                    <div className='relative'>
                      <Input
                        id='userPassword'
                        type={showUserPassword ? 'text' : 'password'}
                        placeholder='Enter password'
                        value={userPassword}
                        onChange={handleUserPasswordChange}
                        className={cn(
                          'h-12 px-4 pr-12 bg-background border transition-all duration-200 hover:border-primary/50 focus:border-primary cursor-text',
                          errors.password &&
                            'border-destructive focus:border-destructive'
                        )}
                        required
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent cursor-pointer transition-colors duration-200'
                        onClick={() => setShowUserPassword(!showUserPassword)}
                      >
                        {showUserPassword ? (
                          <EyeOff className='h-4 w-4 text-muted-foreground' />
                        ) : (
                          <Eye className='h-4 w-4 text-muted-foreground' />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className='text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-200'>
                        <AlertCircle className='h-3 w-3' />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Submit button */}
                  <Button
                    type='submit'
                    className='w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:shadow-lg active:scale-[0.98]'
                    disabled={isUserLoading}
                  >
                    {isUserLoading ? (
                      <div className='flex items-center gap-2'>
                        <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin'></div>
                        Creating User...
                      </div>
                    ) : (
                      'Create User'
                    )}
                  </Button>
                </form>

                {/* Back to Dashboard button */}
                <div className='pt-4 border-t border-border'>
                  <Button
                    variant='outline'
                    onClick={() => navigate('/dashboard')}
                    className='w-full h-12 border-border hover:bg-accent hover:text-accent-foreground transition-all duration-200 group'
                  >
                    <ArrowLeft className='h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1' />
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
