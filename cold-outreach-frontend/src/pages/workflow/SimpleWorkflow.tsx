import React, { useState, useCallback, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle,
  Upload,
  Settings,
  AlertCircle,
  Loader2,
  Mail,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import FileUpload from '@/components/forms/FileUpload';
import { apiClient, handleApiResponse } from '@/services/api';
import CampaignSettingsStep from './CampaignSettingsStep';
import BeginEnrichmentStep from './BeginEnrichmentStep';
import EmailGenerationStep from './EmailGenerationStep';

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
}

// Removed unused UploadProgress interface

interface WorkflowSession {
  id: string;
  status: string;
  currentStep: number;
  configuration: any;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export default function SimpleWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Enhanced workflow management
  const [workflowSession, setWorkflowSession] =
    useState<WorkflowSession | null>(null);
  const [workflowData, setWorkflowData] = useState<{
    csvData?: any;
    campaignData?: any;
    enrichmentData?: any;
    enrichmentResults?: any;
    prospectCount?: number;
    emailGenerationJobId?: string;
    emailGenerationResults?: any;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email generation states
  const [showEmailGenerationSettings, setShowEmailGenerationSettings] =
    useState(false);
  const [emailGenerationParallelism, setEmailGenerationParallelism] = useState<
    number[]
  >([2]);
  const [isEmailGenerationStarting, setIsEmailGenerationStarting] =
    useState(false);

  // Updated to 4 steps (combined step 2 and 3)
  const steps: WorkflowStep[] = [
    {
      id: 1,
      title: 'Upload CSV',
      description: 'Upload your prospect data file',
      icon: <Upload className='h-5 w-5' />,
      completed: completedSteps.includes(1),
      active: currentStep === 1,
    },
    {
      id: 2,
      title: 'Configure Campaign',
      description: 'Set up campaign and enrichment settings',
      icon: <Settings className='h-5 w-5' />,
      completed: completedSteps.includes(2),
      active: currentStep === 2,
    },
    {
      id: 3,
      title: 'Begin Enrichment',
      description: 'Process prospects with AI enrichment',
      icon: <Play className='h-5 w-5' />,
      completed: completedSteps.includes(3),
      active: currentStep === 3,
    },
    {
      id: 4,
      title: 'Email Generation',
      description: 'Generate personalized emails for prospects',
      icon: <Mail className='h-5 w-5' />,
      completed: completedSteps.includes(4),
      active: currentStep === 4,
    },
  ];

  const initializeWorkflow = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/workflow/sessions', {
        type: 'PROSPECT_ENRICHMENT',
        configuration: {
          steps: [
            'UPLOAD_CSV',
            'CAMPAIGN_SETTINGS',
            'BEGIN_ENRICHMENT',
            'EMAIL_GENERATION',
          ],
          settings: {
            allowPause: true,
            autoSave: true,
            timeout: 3600000, // 1 hour
          },
        },
      });

      const data = await handleApiResponse(response);
      if (data.success) {
        setWorkflowSession(data.data);
        setCurrentStep(data.data.progress.current + 1); // Convert to 1-based indexing
      } else {
        throw new Error(data.message || 'Failed to initialize workflow');
      }
    } catch (error) {
      // Continue without workflow session for local development
      console.log('🔄 Workflow running in local mode');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize workflow session when component mounts
  useEffect(() => {
    initializeWorkflow();
  }, [initializeWorkflow]);

  const handleStepComplete = async (stepData: any) => {
    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      // Store step data for future steps
      const updatedData = { ...workflowData };

      if (currentStep === 1) {
        updatedData.csvData = stepData;

        // Validate that we have valid prospect count
        if (!stepData.preview?.totalRows || stepData.preview.totalRows <= 0) {
          const errorMsg = `Invalid CSV file: No prospect data found. Found ${stepData.preview?.totalRows || 0} rows. Please check your CSV file format.`;
          console.error('❌ Invalid prospect count:', stepData.preview?.totalRows);
          throw new Error(errorMsg);
        }

        updatedData.prospectCount = stepData.preview.totalRows;
        console.log('✅ Step 1 Complete - CSV Data:', stepData);
      } else if (currentStep === 2) {
        // Store campaign settings data
        updatedData.campaignData = stepData;
        console.log('✅ Step 2 Complete - Campaign Settings:', stepData);
      } else if (currentStep === 3) {
        updatedData.enrichmentResults = stepData;
        console.log('✅ Step 3 Complete - Enrichment Results:', stepData);
      }

      setWorkflowData(updatedData);
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('❌ Error in handleStepComplete:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepError = (error: string) => {
    setError(error);
    console.error('Step error:', error);
  };

  const startEmailGeneration = async () => {
    console.log('🔥 BUTTON CLICKED! Email generation starting...');
    console.log('🔍 Current workflow data:', workflowData);

    // Try different possible locations for campaign ID
    const campaignId =
      workflowData.campaignData?.campaignId ||
      workflowData.campaignData?.campaignData?.campaignId;
    console.log('🔍 Campaign ID found:', campaignId);
    console.log('🔍 Campaign data structure:', workflowData.campaignData);

    if (!campaignId) {
      const errorMsg =
        'Campaign ID is required for email generation. Please complete campaign configuration in Step 2.';
      console.error('❌ Missing campaign ID:', errorMsg);
      console.error('❌ Available campaign data:', workflowData.campaignData);
      setError(errorMsg);
      return;
    }

    // Extract LLM selection from enrichment configuration
    let selectedAiProvider: 'gemini' | 'openrouter' = 'openrouter'; // Default fallback
    let selectedLLMModelId: string = 'openrouter-o1-mini'; // Default fallback

    // Try to extract LLM model from enrichment configuration data
    const enrichmentConfigData = workflowData.enrichmentData?.data;
    console.log(
      '🔍 Enrichment config data for LLM extraction:',
      enrichmentConfigData
    );

    if (enrichmentConfigData?.selectedModel?.id) {
      const llmModelId = enrichmentConfigData.selectedModel.id;
      console.log('🔍 Found LLM model ID:', llmModelId);
      selectedLLMModelId = llmModelId;

      // Convert LLM model ID to aiProvider
      if (llmModelId === 'gemini-2.0-flash') {
        selectedAiProvider = 'gemini';
        console.log('✅ Using Gemini AI provider based on user selection');
      } else if (llmModelId === 'openrouter-o1-mini') {
        selectedAiProvider = 'openrouter';
        console.log('✅ Using OpenRouter AI provider based on user selection');
      } else {
        selectedAiProvider = 'openrouter';
        console.log(
          '✅ Using OpenRouter AI provider for model:',
          llmModelId
        );
      }
    } else if (enrichmentConfigData?.configuration?.llmModel) {
      const llmModelId = enrichmentConfigData.configuration.llmModel;
      console.log('🔍 Found LLM model in configuration:', llmModelId);
      selectedLLMModelId = llmModelId;

      // Convert LLM model ID to aiProvider
      if (llmModelId === 'gemini-2.0-flash') {
        selectedAiProvider = 'gemini';
        console.log('✅ Using Gemini AI provider based on user selection');
      } else if (llmModelId === 'openrouter-o1-mini') {
        selectedAiProvider = 'openrouter';
        console.log('✅ Using OpenRouter AI provider based on user selection');
      } else {
        selectedAiProvider = 'openrouter';
        console.log(
          '✅ Using OpenRouter AI provider for model:',
          llmModelId
        );
      }
    } else {
      console.log(
        '⚠️ No LLM selection found in workflow data, using default OpenRouter with o1-mini'
      );
      console.log(
        '🔍 Available enrichment data keys:',
        Object.keys(workflowData.enrichmentData || {})
      );
    }

    console.log('🔍 Final LLM selection:', {
      selectedAiProvider,
      selectedLLMModelId
    });

    setIsEmailGenerationStarting(true);
    setError(null);

    try {
      console.log('🚀 Starting email generation with:', {
        campaignId,
        parallelism: emailGenerationParallelism[0],
        selectedAiProvider,
        selectedLLMModelId,
        totalProspects:
          workflowData.enrichmentResults?.completedProspects ||
          workflowData.prospectCount,
      });

      // Create email generation jobs
      const batchJobResponse = await apiClient.post(
        '/api/email-generation/jobs',
        {
          campaignId,
          workflowSessionId: `workflow-${Date.now()}`,
          configuration: {
            parallelism: emailGenerationParallelism[0],
            aiProvider: selectedAiProvider,
            llmModelId: selectedLLMModelId, // Always include the LLM model ID
          },
        }
      );

      // Parse the JSON response using handleApiResponse
      const apiResponse = await handleApiResponse(batchJobResponse);
      console.log('🔍 Full API response:', apiResponse);

      // The API response structure is { success: true, data: { id, ... }, message: '...' }
      const responseData = apiResponse?.data;

      console.log('✅ Email generation job created:', responseData);

      if (!responseData || !responseData.id) {
        throw new Error(
          'Invalid response from email generation API - missing job data or ID'
        );
      }

      // Update workflow data with email generation job info
      setWorkflowData(prev => ({
        ...prev,
        emailGenerationJobId: responseData.id,
        emailGenerationResults: responseData,
      }));

      // Mark step 4 as completed
      setCompletedSteps(prev => [...prev, 4]);

      console.log(
        '✅ Email generation started successfully - UI state updated'
      );
    } catch (error) {
      console.error('❌ Failed to start email generation:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Full error details:', error);
      setError(`Failed to start email generation: ${errorMessage}`);
    } finally {
      // Ensure this always runs to prevent the UI from getting stuck in loading state
      console.log('🔄 Resetting email generation loading state');
      setIsEmailGenerationStarting(false);
    }
  };

  const handleUploadComplete = useCallback((result: any) => {
    // Clear any previous errors since upload completed successfully
    setError(null);

    try {
      // Extract actual prospect count from uploaded file
      let actualProspectCount = 0;
      if (result.preview && result.preview.totalRows) {
        actualProspectCount = result.preview.totalRows;
        console.log(
          `📊 Found ${actualProspectCount} prospects in uploaded file`
        );
      } else {
        // If no preview, this means the upload failed - should not reach here after our fixes
        const errorMsg = 'Upload completed but no prospect data was processed';
        console.error('📊 No preview data found in upload result');
        throw new Error(errorMsg);
      }

      const stepData = {
        uploadId: result.uploadId,
        filename: result.filename,
        preview: {
          totalRows: actualProspectCount,
          validRows: actualProspectCount,
          invalidRows: 0,
          headers: result.preview?.headers || [
            'First Name',
            'Last Name',
            'Email',
            'Company',
          ],
          rows: result.preview?.rows || [], // ✅ Preserve the actual CSV data rows
        },
      };

      console.log(
        `✅ Upload completed with ${stepData.preview.totalRows} prospects - ready for manual advance`
      );

      // Store the upload data but don't auto-advance
      setWorkflowData(prev => ({
        ...prev,
        csvData: stepData,
        prospectCount: stepData.preview.totalRows,
      }));

      // Do NOT call handleStepComplete - let user manually advance
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process upload result';
      setError(errorMessage);
    }
  }, []);

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // If moving from Step 1, complete the step with CSV data
      if (currentStep === 1 && workflowData.csvData) {
        handleStepComplete(workflowData.csvData);
      }
      // If moving from Step 2, check campaign step readiness directly
      else if (currentStep === 2) {
        // Check if campaign step has all required data
        const campaignData = (window as any).__campaignStepData?.();

        if (!campaignData) {
          setError(
            'Please complete all required fields in the campaign configuration'
          );
          return;
        }

        console.log('🔍 DEBUG: Raw campaign data from step 2:', campaignData);

        setIsLoading(true);
        try {
          const finalCampaignData = { ...campaignData };
          console.log(
            '🔍 DEBUG: Final campaign data before processing:',
            finalCampaignData
          );

          // If in new campaign mode and no campaignId, create the campaign first
          if (campaignData.campaignMode === 'new' && !campaignData.campaignId) {
            console.log('🚀 Creating new campaign before proceeding...');

            // Call the campaign creation API
            const response = await fetch(
              `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/campaigns`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: campaignData.campaignName,
                  emailSubject: campaignData.emailSubject,
                  prompt: campaignData.prompt,
                  enrichmentFlags: campaignData.enrichmentServices.map(
                    (s: any) => s.id
                  ),
                  serviceId: campaignData.serviceId,
                }),
              }
            );

            const result = await response.json();

            if (response.ok && result.success) {
              console.log('✅ New campaign created with ID:', result.data.id);
              finalCampaignData.campaignId = result.data.id;
            } else {
              throw new Error(result.message || 'Failed to create campaign');
            }
          }

          // Remove the prospect-campaign association code since it will be handled during enrichment
          console.log('✅ Campaign data prepared:', finalCampaignData);
          handleStepComplete(finalCampaignData);
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to create campaign';
          console.error('❌ Error creating campaign:', error);
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Removed unused startProcessing function

  // No longer need refs - using global function exposure

  // Combined Campaign Settings and Enrichment Configuration Component
  const CombinedCampaignEnrichmentStep = () => {
    // Validate we have valid prospect count before proceeding
    if (!workflowData.prospectCount || workflowData.prospectCount <= 0) {
      console.log(
        `🔍 DEBUG: Validation failed in step 2: prospect count = ${workflowData.prospectCount}`
      );
      return (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            No valid prospect data found. Please go back to Step 1 and upload a
            valid CSV file with prospect information.
            <br />
            <strong>Debug:</strong> Prospect count:{' '}
            {workflowData.prospectCount || 0}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className='space-y-8'>
        {/* Single Campaign Settings Section - includes AI model and enrichment services */}
        <CampaignSettingsStep
          workflowSessionId={workflowSession?.id || 'local-session'}
          prospectCount={workflowData.prospectCount}
          onError={handleStepError}
          disabled={isLoading || isPaused}
        />
      </div>
    );
  };

  const renderStepContent = () => {
    console.log(
      '🔍 Current step:',
      currentStep,
      'Completed steps:',
      completedSteps
    );

    try {
      switch (currentStep) {
        case 1:
          return (
            <div className='space-y-6'>
              <FileUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleStepError}
                maxFiles={1}
                acceptedFileTypes={['text/csv']}
                disabled={isLoading}
              />

              {/* Show CSV Preview after upload */}
              {workflowData.csvData && (
                <div className='mt-6 p-6 bg-gray-50 rounded-lg'>
                  <div className='flex items-center gap-2 mb-4'>
                    <CheckCircle className='h-5 w-5 text-green-500' />
                    <h3 className='text-lg font-semibold text-gray-900'>
                      CSV Upload Complete
                    </h3>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                    <div className='bg-white p-4 rounded-lg border'>
                      <div className='text-2xl font-bold text-blue-600'>
                        {workflowData.csvData.preview.totalRows}
                      </div>
                      <div className='text-sm text-gray-600'>
                        Total Prospects
                      </div>
                    </div>
                    <div className='bg-white p-4 rounded-lg border'>
                      <div className='text-2xl font-bold text-green-600'>
                        {workflowData.csvData.preview.validRows}
                      </div>
                      <div className='text-sm text-gray-600'>Valid Records</div>
                    </div>
                    <div className='bg-white p-4 rounded-lg border'>
                      <div className='text-2xl font-bold text-gray-600'>
                        {workflowData.csvData.filename}
                      </div>
                      <div className='text-sm text-gray-600'>File Name</div>
                    </div>
                  </div>

                  {/* Headers Preview */}
                  <div className='bg-white p-4 rounded-lg border'>
                    <h4 className='font-medium text-gray-900 mb-2'>
                      Detected Columns:
                    </h4>
                    <div className='flex flex-wrap gap-2'>
                      {workflowData.csvData.preview.headers.map(
                        (header: string, index: number) => (
                          <span
                            key={index}
                            className='px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded'
                          >
                            {header}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className='mt-4 p-3 bg-blue-50 rounded-lg'>
                    <p className='text-sm text-blue-800'>
                      ✅ Your CSV file has been successfully processed. Click
                      "Next" to continue with campaign configuration.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        case 2:
          return <CombinedCampaignEnrichmentStep />;
        case 3:
          // Transform the campaign data into the correct enrichmentConfig structure
          const enrichmentConfig = workflowData.enrichmentData || {
            selectedModel: {
              id: workflowData.campaignData?.aiProvider || '',
              name: workflowData.campaignData?.aiProvider || ''
            },
            // Include other campaign settings
            ...workflowData.campaignData
          };

          console.log('🔍 [SimpleWorkflow] Rendering step 3 with data:', {
            workflowSessionId: workflowSession?.id || 'local-session',
            prospectCount: workflowData.prospectCount || 0,
            campaignId: workflowData.campaignData?.campaignId,
            csvFileInfo: workflowData.csvData,
            enrichmentConfig: enrichmentConfig,
            campaignData: workflowData.campaignData,
          });

          return (
            <BeginEnrichmentStep
              workflowSessionId={workflowSession?.id || 'local-session'}
              prospectCount={workflowData.prospectCount || 0}
              campaignId={workflowData.campaignData?.campaignId}
              csvFileInfo={workflowData.csvData}
              enrichmentConfig={enrichmentConfig}
              onStepComplete={handleStepComplete}
              onError={handleStepError}
              disabled={isLoading}
            />
          );
        case 4:
          console.log('🔍 Rendering step 4 - Email Generation');
          console.log('🔍 Current workflow data in step 4:', workflowData);

          // If email generation has started, show the EmailGenerationStep component
          if (workflowData.emailGenerationJobId) {
            return (
              <EmailGenerationStep
                workflowSessionId={workflowSession?.id || 'local-session'}
                prospectCount={workflowData.prospectCount || 0}
                campaignId={workflowData.campaignData?.campaignId}
                emailGenerationJobId={workflowData.emailGenerationJobId}
                enrichmentData={workflowData.enrichmentData}
                onStepComplete={handleStepComplete}
                onError={handleStepError}
                disabled={isLoading}
              />
            );
          }

          // Otherwise, show the initial "Enrichment Complete" view
          return (
            <div className='space-y-6'>
              <div className='text-center'>
                <div className='w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4'>
                  <CheckCircle className='h-8 w-8 text-green-600' />
                </div>
                <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                  Enrichment Complete!
                </h2>
                <p className='text-gray-600'>
                  Your prospects have been enriched successfully. You can now
                  view the results or start email generation.
                </p>
              </div>

              <div className='flex justify-center gap-4'>
                <Button
                  variant='outline'
                  className='gap-2'
                  onClick={() => (window.location.href = '/prospects')}
                >
                  <Eye className='h-4 w-4' />
                  View Prospects
                </Button>

                {/* Email Generation Settings Dialog */}
                <Dialog
                  open={showEmailGenerationSettings}
                  onOpenChange={setShowEmailGenerationSettings}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='p-2'
                      title='Email Generation Settings'
                    >
                      <Settings className='h-4 w-4' />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-[425px]'>
                    <DialogHeader>
                      <DialogTitle>Email Generation Settings</DialogTitle>
                      <DialogDescription>
                        Configure how emails will be generated for your
                        prospects.
                      </DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4 py-4'>
                      <div className='space-y-2'>
                        <Label htmlFor='email-parallelism'>
                          Parallel Processing: {emailGenerationParallelism[0]}{' '}
                          emails at once
                        </Label>
                        <Slider
                          id='email-parallelism'
                          min={1}
                          max={10}
                          step={1}
                          value={emailGenerationParallelism}
                          onValueChange={setEmailGenerationParallelism}
                          className='w-full'
                        />
                        <p className='text-sm text-muted-foreground'>
                          Number of emails to generate simultaneously. Higher
                          values increase speed but use more resources.
                        </p>
                      </div>
                    </div>
                    <div className='flex justify-end gap-2'>
                      <Button
                        variant='outline'
                        onClick={() => setShowEmailGenerationSettings(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setShowEmailGenerationSettings(false)}
                      >
                        Save Settings
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  className='gap-2'
                  onClick={() => {
                    console.log('🔥 Button onClick triggered!');
                    startEmailGeneration();
                  }}
                  disabled={isEmailGenerationStarting}
                >
                  {isEmailGenerationStarting ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Mail className='h-4 w-4' />
                  )}
                  Start Email Generation
                </Button>
              </div>
            </div>
          );
        default:
          return <div>Invalid step</div>;
      }
    } catch (renderError) {
      console.error('❌ Rendering error in step content:', renderError);
      return (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            An error occurred while rendering this step. Please refresh the page
            and try again.
            <br />
            Error:{' '}
            {renderError instanceof Error
              ? renderError.message
              : 'Unknown render error'}
          </AlertDescription>
        </Alert>
      );
    }
  };

  // Add error boundary-like behavior
  try {
    return (
      <div className='min-h-screen bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900'>
              Cold Outreach Workflow
            </h1>
            <p className='text-gray-600 mt-2'>
              Complete the steps below to process your prospects and generate
              personalized emails.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant='destructive' className='mb-6'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress Steps - Only show numbers, no text */}
          <div className='mb-8'>
            <div className='flex items-center max-w-4xl mx-auto'>
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className='flex flex-col items-center'>
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 font-semibold text-sm z-10 ${step.completed
                        ? 'bg-green-500 border-green-500 text-white shadow-sm'
                        : step.active
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md ring-2 ring-blue-200'
                          : 'bg-white border-gray-300 text-gray-500'
                        }`}
                    >
                      {step.completed ? (
                        <CheckCircle className='h-6 w-6' />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className='flex-1 h-px mx-6 relative'>
                      <div
                        className={`absolute inset-0 transition-colors duration-200 ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`}
                      ></div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className='mb-8'>
            <CardContent className='p-8'>{renderStepContent()}</CardContent>
          </Card>

          {/* Navigation */}
          <div className='flex justify-between items-center max-w-4xl mx-auto'>
            <Button
              variant='outline'
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
              className='flex items-center'
            >
              <ChevronLeft className='h-4 w-4 mr-2' />
              Previous
            </Button>

            <div className='text-sm text-gray-500'>
              Step {currentStep} of {steps.length}
            </div>

            <Button
              onClick={handleNext}
              disabled={
                currentStep === steps.length ||
                isLoading ||
                (currentStep === 1 && !workflowData.csvData)
              }
              className='flex items-center'
            >
              {isLoading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              Next
              <ChevronRight className='h-4 w-4 ml-2' />
            </Button>
          </div>
        </div>
      </div>
    );
  } catch (componentError) {
    console.error(
      '❌ Component-level error in SimpleWorkflow:',
      componentError
    );
    return (
      <div className='min-h-screen bg-white flex items-center justify-center'>
        <Alert variant='destructive' className='max-w-lg'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            A critical error occurred in the workflow component. Please refresh
            the page and try again.
            <br />
            Error:{' '}
            {componentError instanceof Error
              ? componentError.message
              : 'Unknown component error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
