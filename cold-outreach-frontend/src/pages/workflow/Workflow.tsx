import { useState } from 'react';
import {
  StepProgress,
  WorkflowNavigation,
  WorkflowHeader,
  enrichmentSteps,
  type WorkflowStep,
} from '@/components/workflow';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Settings,
  Zap,
  Eye,
  Download,
  FileSpreadsheet,
  Database,
  Mail,
  CheckCircle,
} from 'lucide-react';

export default function Workflow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [workflowStartTime] = useState(new Date());

  // Update step status based on current progress
  const updateStepStatus = (
    steps: WorkflowStep[],
    current: number
  ): WorkflowStep[] => {
    return steps.map((step, index) => ({
      ...step,
      status:
        index < current
          ? 'completed'
          : index === current
            ? 'current'
            : 'pending',
    }));
  };

  const steps = updateStepStatus(enrichmentSteps, currentStep);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsLoading(true);
      // Simulate processing time
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsLoading(false);
      }, 1500);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    console.log('Workflow cancelled');
    // In a real app, navigate back to dashboard
  };

  const handleSave = () => {
    console.log('Progress saved');
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Upload Prospects
        return (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Upload className='h-5 w-5' />
                Upload Prospect Data
              </CardTitle>
              <CardDescription>
                Upload a CSV file containing your prospect information
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center'>
                <Upload className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
                <h3 className='text-lg font-semibold mb-2'>
                  Choose a CSV file
                </h3>
                <p className='text-muted-foreground mb-4'>
                  Drop your file here or click to browse
                </p>
                <Button>
                  <FileSpreadsheet className='mr-2 h-4 w-4' />
                  Browse Files
                </Button>
              </div>

              <div className='text-sm text-muted-foreground bg-muted p-4 rounded-lg'>
                <strong>Required columns:</strong> Name, Company, Email
                (optional: Title, LinkedIn URL, Phone)
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Configure Enrichment
        return (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                Configure Enrichment Options
              </CardTitle>
              <CardDescription>
                Select which data points you want to enrich for your prospects
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-3'>
                  <h4 className='font-medium'>Contact Information</h4>
                  <div className='space-y-2 text-sm'>
                    <label className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        defaultChecked
                        className='rounded'
                      />
                      Email addresses
                    </label>
                    <label className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        defaultChecked
                        className='rounded'
                      />
                      Phone numbers
                    </label>
                    <label className='flex items-center gap-2'>
                      <input type='checkbox' className='rounded' />
                      LinkedIn profiles
                    </label>
                  </div>
                </div>

                <div className='space-y-3'>
                  <h4 className='font-medium'>Company Data</h4>
                  <div className='space-y-2 text-sm'>
                    <label className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        defaultChecked
                        className='rounded'
                      />
                      Company size
                    </label>
                    <label className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        defaultChecked
                        className='rounded'
                      />
                      Industry
                    </label>
                    <label className='flex items-center gap-2'>
                      <input type='checkbox' className='rounded' />
                      Revenue data
                    </label>
                  </div>
                </div>
              </div>

              <div className='bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg'>
                <h4 className='font-medium text-blue-900 dark:text-blue-100 mb-2'>
                  Estimated Cost: $24.50
                </h4>
                <p className='text-sm text-blue-700 dark:text-blue-300'>
                  For 245 prospects • ~$0.10 per prospect
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Process Data
        return (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Zap className='h-5 w-5' />
                Processing Prospect Data
              </CardTitle>
              <CardDescription>
                AI is enriching your prospect profiles with additional data
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Email enrichment</span>
                  <Badge variant='default'>Complete</Badge>
                </div>
                <Progress value={100} className='h-2' />

                <div className='flex items-center justify-between'>
                  <span className='text-sm'>LinkedIn profile matching</span>
                  <Badge variant='default'>Complete</Badge>
                </div>
                <Progress value={100} className='h-2' />

                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Company data enrichment</span>
                  <Badge variant='secondary'>In Progress</Badge>
                </div>
                <Progress value={67} className='h-2' />
              </div>

              <div className='grid gap-4 md:grid-cols-3 text-center'>
                <div className='space-y-2'>
                  <div className='text-2xl font-bold text-green-600'>189</div>
                  <div className='text-sm text-muted-foreground'>
                    Emails found
                  </div>
                </div>
                <div className='space-y-2'>
                  <div className='text-2xl font-bold text-blue-600'>156</div>
                  <div className='text-sm text-muted-foreground'>
                    LinkedIn profiles
                  </div>
                </div>
                <div className='space-y-2'>
                  <div className='text-2xl font-bold text-purple-600'>134</div>
                  <div className='text-sm text-muted-foreground'>
                    Company data
                  </div>
                </div>
              </div>

              {isPaused && (
                <div className='bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg'>
                  <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                    ⏸️ Processing paused. Click Resume to continue enrichment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3: // Review Results
        return (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Eye className='h-5 w-5' />
                Review Enriched Data
              </CardTitle>
              <CardDescription>
                Review and validate the enriched prospect information
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <div className='text-center space-y-2'>
                  <div className='text-2xl font-bold'>245</div>
                  <div className='text-sm text-muted-foreground'>
                    Total prospects
                  </div>
                </div>
                <div className='text-center space-y-2'>
                  <div className='text-2xl font-bold text-green-600'>189</div>
                  <div className='text-sm text-muted-foreground'>
                    Successfully enriched
                  </div>
                </div>
                <div className='text-center space-y-2'>
                  <div className='text-2xl font-bold text-yellow-600'>34</div>
                  <div className='text-sm text-muted-foreground'>
                    Partially enriched
                  </div>
                </div>
                <div className='text-center space-y-2'>
                  <div className='text-2xl font-bold text-gray-600'>22</div>
                  <div className='text-sm text-muted-foreground'>Not found</div>
                </div>
              </div>

              <div className='space-y-3'>
                <h4 className='font-medium'>Sample Enriched Data</h4>
                <div className='border rounded-lg p-4 space-y-2'>
                  <div className='font-medium'>
                    John Smith • CTO at TechCorp
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    john.smith@techcorp.com • (555) 123-4567 •
                    linkedin.com/in/johnsmith
                  </div>
                  <div className='text-sm'>
                    Company: 50-200 employees, Software Industry, $10M-50M
                    revenue
                  </div>
                </div>
              </div>

              <div className='flex gap-3'>
                <Button variant='outline'>
                  <Database className='mr-2 h-4 w-4' />
                  View All Data
                </Button>
                <Button variant='outline'>
                  <Mail className='mr-2 h-4 w-4' />
                  Generate Emails
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 4: // Export Data
        return (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Download className='h-5 w-5' />
                Export Enriched Data
              </CardTitle>
              <CardDescription>
                Download your enriched prospect data
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='text-center space-y-4'>
                <div className='flex items-center justify-center w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full'>
                  <CheckCircle className='h-8 w-8' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold'>
                    Enrichment Complete!
                  </h3>
                  <p className='text-muted-foreground'>
                    Your prospect data has been successfully enriched
                  </p>
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <Button className='flex items-center gap-2'>
                  <Download className='h-4 w-4' />
                  Download CSV
                </Button>
                <Button variant='outline' className='flex items-center gap-2'>
                  <Mail className='h-4 w-4' />
                  Create Campaign
                </Button>
              </div>

              <div className='text-center text-sm text-muted-foreground'>
                Data will be available for download for 30 days
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className='max-w-4xl mx-auto'>
      {/* Workflow Header */}
      <WorkflowHeader
        title='Prospect Enrichment Workflow'
        subtitle='Enhance your prospect data with AI-powered enrichment'
        currentStep={currentStep}
        totalSteps={steps.length}
        onCancel={handleCancel}
        onSave={handleSave}
        status={isPaused ? 'paused' : isLoading ? 'in-progress' : 'in-progress'}
        startTime={workflowStartTime}
        estimatedTimeRemaining={isPaused ? 0 : (steps.length - currentStep) * 2}
      />

      <div className='space-y-8'>
        {/* Step Progress Indicator */}
        <StepProgress
          steps={steps}
          currentStep={currentStep}
          showDescriptions={true}
          orientation='horizontal'
        />

        {/* Step Content */}
        <div className='min-h-[400px]'>{renderStepContent()}</div>

        {/* Workflow Navigation */}
        <WorkflowNavigation
          currentStep={currentStep}
          totalSteps={steps.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onCancel={handleCancel}
          onSave={handleSave}
          onPause={handlePause}
          onResume={handleResume}
          isLoading={isLoading}
          isPaused={isPaused}
          showSave={true}
          showPauseResume={currentStep === 2} // Show during processing step
        />
      </div>
    </div>
  );
}
