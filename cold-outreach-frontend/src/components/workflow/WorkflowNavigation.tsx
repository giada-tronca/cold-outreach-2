import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Save, X, Play, Pause } from 'lucide-react';

interface WorkflowNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  canPrevious?: boolean;
  canNext?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  isLoading?: boolean;
  isPaused?: boolean;
  className?: string;
  showSave?: boolean;
  showPauseResume?: boolean;
}

export function WorkflowNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onCancel,
  onSave,
  onPause,
  onResume,
  canPrevious = currentStep > 0,
  canNext = currentStep < totalSteps - 1,
  nextLabel,
  previousLabel,
  isLoading = false,
  isPaused = false,
  className,
  showSave = false,
  showPauseResume = false,
}: WorkflowNavigationProps) {
  const getNextLabel = () => {
    if (nextLabel) return nextLabel;
    if (currentStep === totalSteps - 1) return 'Complete';
    return 'Next';
  };

  const getPreviousLabel = () => {
    if (previousLabel) return previousLabel;
    return 'Previous';
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border bg-background p-4',
        className
      )}
    >
      {/* Left side - Previous button */}
      <div className='flex items-center gap-2'>
        {canPrevious && (
          <Button
            variant='outline'
            onClick={onPrevious}
            disabled={isLoading}
            className='flex items-center gap-2'
          >
            <ChevronLeft className='h-4 w-4' />
            {getPreviousLabel()}
          </Button>
        )}
      </div>

      {/* Center - Step info and controls */}
      <div className='flex items-center gap-4'>
        {/* Step counter */}
        <div className='text-sm text-muted-foreground hidden sm:block'>
          Step {currentStep + 1} of {totalSteps}
        </div>

        {/* Pause/Resume controls */}
        {showPauseResume && (
          <div className='flex items-center gap-2'>
            {isPaused ? (
              <Button
                variant='outline'
                size='sm'
                onClick={onResume}
                disabled={isLoading}
                className='flex items-center gap-2'
              >
                <Play className='h-4 w-4' />
                Resume
              </Button>
            ) : (
              <Button
                variant='outline'
                size='sm'
                onClick={onPause}
                disabled={isLoading}
                className='flex items-center gap-2'
              >
                <Pause className='h-4 w-4' />
                Pause
              </Button>
            )}
          </div>
        )}

        {/* Save button */}
        {showSave && (
          <Button
            variant='outline'
            size='sm'
            onClick={onSave}
            disabled={isLoading}
            className='flex items-center gap-2'
          >
            <Save className='h-4 w-4' />
            Save Progress
          </Button>
        )}
      </div>

      {/* Right side - Next and Cancel buttons */}
      <div className='flex items-center gap-2'>
        {onCancel && (
          <Button
            variant='ghost'
            onClick={onCancel}
            disabled={isLoading}
            className='flex items-center gap-2 text-muted-foreground hover:text-foreground'
          >
            <X className='h-4 w-4' />
            <span className='hidden sm:inline'>Cancel</span>
          </Button>
        )}

        {canNext && (
          <Button
            onClick={onNext}
            disabled={isLoading}
            className='flex items-center gap-2'
          >
            {isLoading ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                Processing...
              </>
            ) : (
              <>
                {getNextLabel()}
                <ChevronRight className='h-4 w-4' />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Specialized navigation components for specific workflows
export function EnrichmentNavigation(
  props: Omit<WorkflowNavigationProps, 'showPauseResume' | 'showSave'>
) {
  return (
    <WorkflowNavigation
      {...props}
      showPauseResume={props.currentStep === 2} // Show during processing step
      showSave={true}
    />
  );
}

export function CampaignNavigation(
  props: Omit<WorkflowNavigationProps, 'showPauseResume' | 'showSave'>
) {
  return (
    <WorkflowNavigation
      {...props}
      showPauseResume={props.currentStep === 2} // Show during email generation
      showSave={true}
    />
  );
}

// Mobile-optimized navigation for smaller screens
export function MobileWorkflowNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onCancel,
  canPrevious = currentStep > 0,
  canNext = currentStep < totalSteps - 1,
  isLoading = false,
  className,
}: Pick<
  WorkflowNavigationProps,
  | 'currentStep'
  | 'totalSteps'
  | 'onPrevious'
  | 'onNext'
  | 'onCancel'
  | 'canPrevious'
  | 'canNext'
  | 'isLoading'
  | 'className'
>) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 border-t bg-background p-4 lg:hidden',
        className
      )}
    >
      <div className='flex items-center justify-between gap-4'>
        {/* Step progress */}
        <div className='text-sm text-muted-foreground'>
          {currentStep + 1}/{totalSteps}
        </div>

        {/* Navigation buttons */}
        <div className='flex items-center gap-2'>
          {onCancel && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}

          {canPrevious && (
            <Button
              variant='outline'
              size='sm'
              onClick={onPrevious}
              disabled={isLoading}
            >
              Previous
            </Button>
          )}

          {canNext && (
            <Button size='sm' onClick={onNext} disabled={isLoading}>
              {isLoading
                ? 'Loading...'
                : currentStep === totalSteps - 1
                  ? 'Complete'
                  : 'Next'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
