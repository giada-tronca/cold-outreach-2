import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        default: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      variant: {
        default: 'text-primary',
        secondary: 'text-secondary',
        destructive: 'text-destructive',
        muted: 'text-muted-foreground',
        accent: 'text-accent-foreground',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Optional text to display alongside the spinner
   */
  children?: React.ReactNode;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, children, ...props }, ref) => {
    if (children) {
      return (
        <div
          ref={ref}
          className={cn('flex items-center gap-2', className)}
          {...props}
        >
          <div className={cn(spinnerVariants({ size, variant }))} />
          <span className='text-sm text-muted-foreground'>{children}</span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant }), className)}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

// Loading overlay component
const LoadingOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isLoading?: boolean;
    text?: string;
  }
>(
  (
    { className, isLoading = true, text = 'Loading...', children, ...props },
    ref
  ) => {
    if (!isLoading) return <>{children}</>;

    return (
      <div
        ref={ref}
        className={cn('relative min-h-32 w-full', className)}
        {...props}
      >
        {children && (
          <div className='opacity-50 pointer-events-none'>{children}</div>
        )}
        <div className='absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
          <div className='flex flex-col items-center gap-3'>
            <Spinner size='lg' />
            <p className='text-sm text-muted-foreground'>{text}</p>
          </div>
        </div>
      </div>
    );
  }
);
LoadingOverlay.displayName = 'LoadingOverlay';

// Inline loading component
const LoadingInline = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: VariantProps<typeof spinnerVariants>['size'];
    text?: string;
  }
>(({ className, size = 'sm', text, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <Spinner size={size} />
      {text && <span className='text-sm text-muted-foreground'>{text}</span>}
    </div>
  );
});
LoadingInline.displayName = 'LoadingInline';

export { Spinner, LoadingOverlay, LoadingInline, spinnerVariants };
