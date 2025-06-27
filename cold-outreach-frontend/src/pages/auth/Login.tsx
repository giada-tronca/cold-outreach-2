import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Attempt login using Auth context
      const result = await login(email, password, rememberMe);

      if (result.success) {
        // Redirect to dashboard on successful login
        navigate('/dashboard');
      } else {
        // Handle login errors
        setErrors({ general: result.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      const { email, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
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

        {/* Main login container - centered */}
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

              {/* Login form */}
              <div className='space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-300'>
                <div>
                  <h3 className='text-2xl font-bold text-foreground mb-2'>
                    Login
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Your AI powered email generation
                  </p>
                </div>

                {/* General error message */}
                {errors.general && (
                  <div className='flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm animate-in fade-in-0 slide-in-from-top-1 duration-300'>
                    <AlertCircle className='h-4 w-4 flex-shrink-0' />
                    <span>{errors.general}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className='space-y-4'>
                  {/* Email field */}
                  <div className='space-y-2'>
                    <Label
                      htmlFor='email'
                      className='text-sm font-medium text-foreground'
                    >
                      Your Email
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      placeholder='your.email@example.com'
                      value={email}
                      onChange={handleEmailChange}
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
                      htmlFor='password'
                      className='text-sm font-medium text-foreground'
                    >
                      Password
                    </Label>
                    <div className='relative'>
                      <Input
                        id='password'
                        type={showPassword ? 'text' : 'password'}
                        placeholder='Enter your password'
                        value={password}
                        onChange={handlePasswordChange}
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
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
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

                  {/* Remember me and forgot password */}
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='remember'
                        checked={rememberMe}
                        onCheckedChange={checked =>
                          setRememberMe(checked as boolean)
                        }
                        className='cursor-pointer'
                      />
                      <Label
                        htmlFor='remember'
                        className='text-sm text-muted-foreground cursor-pointer'
                      >
                        Remember me
                      </Label>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href='mailto:ns@scalarly.com?subject=Password Reset Request&body=Hello, I need to reset my password for the Cold Outreach application. Please assist me with this request.'
                            className='text-sm text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors duration-200'
                          >
                            Forgot Password?
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Send an email to administrator to reset your
                            password
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Login button */}
                  <Button
                    type='submit'
                    disabled={isLoading}
                    className={cn(
                      'w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200 cursor-pointer',
                      'transform hover:scale-[1.02] active:scale-[0.98]',
                      isLoading && 'opacity-70 cursor-not-allowed scale-100'
                    )}
                  >
                    {isLoading ? (
                      <div className='flex items-center gap-2'>
                        <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin'></div>
                        Signing in...
                      </div>
                    ) : (
                      'Login'
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
