import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface WorkflowStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
  optional?: boolean;
}

interface StepProgressProps {
  steps: WorkflowStep[];
  currentStep: number;
  className?: string;
  showDescriptions?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function StepProgress({
  steps,
  currentStep,
  className,
  orientation = 'horizontal',
}: StepProgressProps) {
  return (
    <div
      className={cn(
        'w-full',
        orientation === 'vertical' ? 'space-y-4' : '',
        className
      )}
    >
      <nav aria-label='Progress'>
        <ol
          className={cn(
            orientation === 'horizontal' ? 'flex items-center' : 'space-y-6'
          )}
        >
          {steps.map((step, stepIndex) => {
            const isCompleted = step.status === 'completed';
            const isCurrent =
              step.status === 'current' || stepIndex === currentStep;
            const isError = step.status === 'error';
            const isPending = step.status === 'pending';

            return (
              <li
                key={step.id}
                className={cn(
                  orientation === 'horizontal' ? 'flex items-center' : ''
                )}
              >
                {/* Step indicator */}
                <div className='relative flex items-center justify-center'>
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 font-semibold text-sm z-10 bg-white',
                      isCompleted &&
                        'border-green-500 bg-green-500 text-white shadow-sm',
                      isCurrent &&
                        'border-blue-500 bg-blue-500 text-white shadow-md ring-2 ring-blue-200',
                      isError &&
                        'border-red-500 bg-red-500 text-white shadow-sm',
                      isPending && 'border-gray-300 bg-white text-gray-500'
                    )}
                  >
                    {isCompleted ? (
                      <Check className='h-5 w-5' />
                    ) : isError ? (
                      <span>!</span>
                    ) : (
                      <span>{stepIndex + 1}</span>
                    )}
                  </div>

                  {/* Optional badge */}
                  {step.optional && (
                    <span className='absolute -top-1 -right-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 z-20'>
                      Optional
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {stepIndex !== steps.length - 1 &&
                  orientation === 'horizontal' && (
                    <div className='flex-1 h-px mx-4'>
                      <div
                        className={cn(
                          'h-full w-full transition-colors duration-200',
                          isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        )}
                      />
                    </div>
                  )}

                {/* Vertical connector line */}
                {stepIndex !== steps.length - 1 &&
                  orientation === 'vertical' && (
                    <div className='flex justify-center w-full'>
                      <div
                        className={cn(
                          'w-px h-8 transition-colors duration-200',
                          isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        )}
                      />
                    </div>
                  )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

// Predefined step configurations for common workflows
export const enrichmentSteps: WorkflowStep[] = [
  {
    id: 'UPLOAD_CSV',
    title: 'Upload CSV',
    description: 'Upload prospect data from CSV file',
    status: 'pending',
  },
  {
    id: 'CAMPAIGN_SETTINGS',
    title: 'Campaign Settings',
    description: 'Configure campaign details and templates',
    status: 'pending',
  },
  {
    id: 'ENRICHMENT_CONFIG',
    title: 'Enrichment Configuration',
    description: 'Select enrichment services and AI models',
    status: 'pending',
  },
  {
    id: 'BEGIN_ENRICHMENT',
    title: 'Begin Enrichment',
    description: 'Process prospects with AI enrichment',
    status: 'pending',
  },
  {
    id: 'EMAIL_GENERATION',
    title: 'Email Generation',
    description: 'Generate personalized outreach emails',
    status: 'pending',
  },
];

export const campaignSteps: WorkflowStep[] = [
  {
    id: 'prospects',
    title: 'Select Prospects',
    description: 'Choose prospects for your campaign',
    status: 'pending',
  },
  {
    id: 'campaign',
    title: 'Campaign Settings',
    description: 'Configure campaign parameters',
    status: 'pending',
  },
  {
    id: 'generate',
    title: 'Generate Emails',
    description: 'AI generates personalized emails',
    status: 'pending',
  },
  {
    id: 'review',
    title: 'Review & Send',
    description: 'Review emails and send campaign',
    status: 'pending',
  },
];
