import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, Save, Clock } from 'lucide-react';
import { useState } from 'react';

interface WorkflowHeaderProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onCancel?: () => void;
  onSave?: () => void;
  showProgress?: boolean;
  showSave?: boolean;
  className?: string;
  status?: 'in-progress' | 'paused' | 'error' | 'completed';
  startTime?: Date;
  estimatedTimeRemaining?: number; // in minutes
}

export function WorkflowHeader({
  title,
  subtitle,
  currentStep,
  totalSteps,
  onCancel,
  onSave,
  showProgress = true,
  showSave = true,
  className,
  status = 'in-progress',
  startTime,
  estimatedTimeRemaining,
}: WorkflowHeaderProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  const getStatusBadge = () => {
    switch (status) {
      case 'in-progress':
        return (
          <Badge
            variant='default'
            className='bg-blue-100 text-blue-700 border-blue-200'
          >
            <div className='h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse' />
            In Progress
          </Badge>
        );
      case 'paused':
        return (
          <Badge
            variant='secondary'
            className='bg-yellow-100 text-yellow-700 border-yellow-200'
          >
            <Clock className='h-3 w-3 mr-1' />
            Paused
          </Badge>
        );
      case 'error':
        return (
          <Badge variant='destructive'>
            <AlertTriangle className='h-3 w-3 mr-1' />
            Error
          </Badge>
        );
      case 'completed':
        return (
          <Badge
            variant='default'
            className='bg-green-100 text-green-700 border-green-200'
          >
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getElapsedTime = () => {
    if (!startTime) return null;
    const now = new Date();
    const elapsed = Math.floor(
      (now.getTime() - startTime.getTime()) / 1000 / 60
    ); // minutes

    if (elapsed < 1) return 'Just started';
    if (elapsed < 60) return `${elapsed}m elapsed`;

    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    return `${hours}h ${minutes}m elapsed`;
  };

  const handleCancel = () => {
    setShowCancelDialog(false);
    onCancel?.();
  };

  return (
    <div className={cn('border-b bg-background px-6 py-4', className)}>
      <div className='flex items-center justify-between'>
        {/* Left side - Title and status */}
        <div className='space-y-2'>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
            {getStatusBadge()}
          </div>

          {subtitle && <p className='text-muted-foreground'>{subtitle}</p>}

          {/* Time information */}
          <div className='flex items-center gap-4 text-sm text-muted-foreground'>
            {getElapsedTime() && <span>{getElapsedTime()}</span>}
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <span>• ~{estimatedTimeRemaining}m remaining</span>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className='flex items-center gap-3'>
          {showSave && onSave && (
            <Button
              variant='outline'
              onClick={onSave}
              className='flex items-center gap-2'
            >
              <Save className='h-4 w-4' />
              Save Progress
            </Button>
          )}

          {onCancel && (
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogTrigger asChild>
                <Button
                  variant='ghost'
                  className='flex items-center gap-2 text-muted-foreground hover:text-foreground'
                >
                  <X className='h-4 w-4' />
                  Cancel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Workflow</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel this workflow? Any progress
                    made will be lost.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setShowCancelDialog(false)}
                  >
                    Continue Working
                  </Button>
                  <Button variant='destructive' onClick={handleCancel}>
                    Yes, Cancel Workflow
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Progress section */}
      {showProgress && (
        <div className='mt-4 space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className='font-medium'>{progressPercentage}% complete</span>
          </div>
          <Progress value={progressPercentage} className='h-2' />
        </div>
      )}
    </div>
  );
}

// Specialized headers for different workflow types
export function EnrichmentWorkflowHeader(
  props: Omit<WorkflowHeaderProps, 'title'>
) {
  return (
    <WorkflowHeader
      {...props}
      title='Prospect Enrichment'
      subtitle='Enhance your prospect data with AI-powered enrichment'
    />
  );
}

export function CampaignWorkflowHeader(
  props: Omit<WorkflowHeaderProps, 'title'>
) {
  return (
    <WorkflowHeader
      {...props}
      title='Campaign Creation'
      subtitle='Create and launch your cold outreach campaign'
    />
  );
}

// Compact header for mobile screens
export function CompactWorkflowHeader({
  title,
  currentStep,
  totalSteps,
  onCancel,
  className,
  status: _ = 'in-progress',
}: Pick<
  WorkflowHeaderProps,
  'title' | 'currentStep' | 'totalSteps' | 'onCancel' | 'className' | 'status'
>) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  const handleCancel = () => {
    setShowCancelDialog(false);
    onCancel?.();
  };

  return (
    <div className={cn('border-b bg-background px-4 py-3', className)}>
      <div className='flex items-center justify-between'>
        <div className='min-w-0 flex-1'>
          <h1 className='text-lg font-semibold truncate'>{title}</h1>
          <div className='mt-1 flex items-center gap-2'>
            <Progress value={progressPercentage} className='h-1 flex-1' />
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>

        {onCancel && (
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogTrigger asChild>
              <Button variant='ghost' size='sm' className='ml-2'>
                <X className='h-4 w-4' />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Workflow</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this workflow? Any progress
                  made will be lost.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setShowCancelDialog(false)}
                >
                  Continue
                </Button>
                <Button variant='destructive' onClick={handleCancel}>
                  Cancel Workflow
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
