import React, { useState, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
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

// Removed WorkflowSession interface - using local state management only

export default function SimpleWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Simplified workflow management - no server session for step 1
  const [workflowData, setWorkflowData] = useState<{
    csvData?: any;
    batchName?: string;
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

  // Step 1 specific state
  const [batchName, setBatchName] = useState<string>('');

  // Email generation states
  const [showEmailGenerationSettings, setShowEmailGenerationSettings] =
    useState(false);
  const [emailGenerationParallelism, setEmailGenerationParallelism] = useState<
    number[]
  >([2]);
  const [isEmailGenerationStarting, setIsEmailGenerationStarting] =
    useState(false);

  // Workflow session will only be created when needed in step 3
  // Removed workflow session for local-only processing in step 1

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

  // Remove automatic workflow initialization - only create when needed in step 3
  // useEffect removed

  const handleStepComplete = async (stepData: any) => {
    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      // Store step data for future steps
      const updatedData = { ...workflowData };

      if (currentStep === 1) {
        updatedData.csvData = stepData;
        updatedData.batchName = stepData.batchName;

        // Validate that we have valid prospect count
        if (!stepData.preview?.totalRows || stepData.preview.totalRows <= 0) {
          const errorMsg = `Invalid CSV file: No prospect data found. Found ${stepData.preview?.totalRows || 0} rows. Please check your CSV file format.`;
          console.error('❌ Invalid prospect count:', stepData.preview?.totalRows);
          throw new Error(errorMsg);
        }

        updatedData.prospectCount = stepData.preview.totalRows;
        console.log('✅ Step 1 Complete - CSV Data with Batch Name:', stepData);
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
        console.log(`📊 Local CSV processing found ${actualProspectCount} prospects`);
      } else {
        const errorMsg = 'CSV processing completed but no prospect data was found';
        console.error('📊 No preview data found in processing result');
        throw new Error(errorMsg);
      }

      const stepData = {
        // Generate local ID for step data tracking (no server upload)
        localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename: result.filename || 'uploaded-file.csv',
        fileSize: result.fileSize || 0,
        processedAt: new Date().toISOString(),
        preview: {
          totalRows: actualProspectCount,
          validRows: result.preview.validRows || actualProspectCount,
          invalidRows: result.preview.invalidRows || 0,
          headers: result.preview.headers || [],
          rows: result.preview.rows || [],
        },
        // Store the raw file data for later upload in step 3
        rawFileData: result.rawFileData || null,
      };

      console.log(`✅ Local CSV processing completed with ${stepData.preview.totalRows} prospects - ready for next step`);

      // Store the processed data locally and reset batch name for new upload
      setWorkflowData(prev => ({
        ...prev,
        csvData: stepData,
        prospectCount: stepData.preview.totalRows,
      }));

      // Auto-fill batch name with timestamp format: Batch_DD-MMM-YY-HH:MM:SS
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = now.toLocaleString('en', { month: 'short' });
      const year = now.getFullYear().toString().slice(-2);
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');

      const autoGeneratedBatchName = `Batch_${day}-${month}-${year}-${hours}:${minutes}:${seconds}`;
      setBatchName(autoGeneratedBatchName);

    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process CSV file locally';
      setError(errorMessage);
    }
  }, []);

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // If moving from Step 1, complete the step with CSV data
      if (currentStep === 1 && workflowData.csvData) {
        // Validate batch name
        if (!batchName.trim()) {
          setError('Please enter a batch name before proceeding to the next step');
          return;
        }

        const step1Data = {
          ...workflowData.csvData,
          batchName: batchName.trim(),
        };

        console.log('🔄 Moving from Step 1 to Step 2');
        console.log('📋 Data being passed to Step 2:', {
          csvData: step1Data,
          batchName: batchName.trim(),
          prospectCount: workflowData.prospectCount,
          filename: workflowData.csvData.filename,
          headers: workflowData.csvData.preview.headers,
          totalRows: workflowData.csvData.preview.totalRows,
          validRows: workflowData.csvData.preview.validRows,
          currentStep: 1,
          nextStep: 2,
          completedSteps: completedSteps
        });
        handleStepComplete(step1Data);
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

            // Call the campaign creation API using apiClient
            const result = await apiClient.post('/api/campaigns', {
              name: campaignData.campaignName,
              emailSubject: campaignData.emailSubject,
              prompt: campaignData.prompt,
              enrichmentFlags: campaignData.enrichmentServices.map(
                (s: any) => s.id
              ),
              serviceId: campaignData.serviceId,
            });

            const responseData = await handleApiResponse(result);

            if (responseData.success) {
              console.log('✅ New campaign created with ID:', responseData.data.id);
              finalCampaignData.campaignId = responseData.data.id;
            } else {
              throw new Error(responseData.message || 'Failed to create campaign');
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
          workflowSessionId={'local-session'}
          prospectCount={workflowData.prospectCount}
          csvData={workflowData.csvData}
          batchName={workflowData.batchName || undefined}
          onError={handleStepError}
          disabled={isLoading || isPaused}
        />
      </div>
    );
  };

  const renderStepContent = () => {
    // Only log step changes, not on every render
    const stepKey = `${currentStep}-${completedSteps.join(',')}`;
    const lastStepKey = React.useRef<string>('');

    if (lastStepKey.current !== stepKey) {
      console.log('🔍 Step changed:', { currentStep, completedSteps });
      lastStepKey.current = stepKey;
    }

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

              {/* Batch Name Input - Show after CSV upload */}
              {workflowData.csvData && (
                <Card>
                  <CardContent className='p-6'>
                    <div className='space-y-4'>
                      <div>
                        <Label htmlFor='batch-name' className='text-sm font-medium text-gray-700'>
                          Batch Name *
                        </Label>
                        <Input
                          id='batch-name'
                          type='text'
                          placeholder='Enter a name for this batch (e.g., "Q1 2024 Prospects")'
                          value={batchName}
                          onChange={(e) => setBatchName(e.target.value)}
                          className='mt-1'
                          disabled={isLoading}
                        />
                        <p className='text-xs text-gray-500 mt-1'>
                          This name will help you identify this batch of prospects in your campaign.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Show CSV Preview after upload */}
              {workflowData.csvData && (
                <div className='mt-6 space-y-6'>
                  <div className='flex items-center gap-2'>
                    <CheckCircle className='h-5 w-5 text-green-500' />
                    <h3 className='text-lg font-semibold text-gray-900'>
                      CSV Upload Complete
                    </h3>
                  </div>

                  {/* Stats Cards */}
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <Card>
                      <CardContent className='p-4'>
                        <div className='text-2xl font-bold text-blue-600'>
                          {workflowData.csvData.preview.totalRows}
                        </div>
                        <div className='text-sm text-gray-600'>
                          Total Prospects
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className='p-4'>
                        <div className='text-2xl font-bold text-green-600'>
                          {workflowData.csvData.preview.validRows}
                        </div>
                        <div className='text-sm text-gray-600'>Valid Records</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className='p-4'>
                        <div className='text-2xl font-bold text-gray-600 truncate'>
                          {workflowData.csvData.filename}
                        </div>
                        <div className='text-sm text-gray-600'>File Name</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* CSV Data Preview Table */}
                  <Card>
                    <CardContent className='p-6'>
                      <h4 className='font-medium text-gray-900 mb-4'>
                        Data Preview (First 5 Rows)
                      </h4>
                      <div className='overflow-x-auto border rounded-lg'>
                        <table className='min-w-full divide-y divide-gray-200'>
                          <thead className='bg-gray-50'>
                            <tr>
                              {workflowData.csvData.preview.headers.map(
                                (header: string, index: number) => (
                                  <th
                                    key={index}
                                    className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap'
                                  >
                                    {header}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody className='bg-white divide-y divide-gray-200'>
                            {workflowData.csvData.preview.rows.map(
                              (row: string[], rowIndex: number) => (
                                <tr key={rowIndex} className='hover:bg-gray-50'>
                                  {row.map((cell: string, cellIndex: number) => (
                                    <td
                                      key={cellIndex}
                                      className='px-4 py-3 text-sm text-gray-900 whitespace-nowrap max-w-xs truncate'
                                      title={cell} // Show full content on hover
                                    >
                                      {cell || '-'}
                                    </td>
                                  ))}
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                      {workflowData.csvData.preview.totalRows > 5 && (
                        <p className='text-xs text-gray-500 mt-3'>
                          Showing 5 of {workflowData.csvData.preview.totalRows} total rows
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Success Message */}
                  <div className='p-4 bg-green-50 rounded-lg border border-green-200'>
                    <p className='text-sm text-green-800'>
                      ✅ Your CSV file has been successfully processed. Enter a batch name above and click
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

          console.log('[SimpleWorkflow] Rendering Step 3 with data:');
          console.log('  • Prospect Count:', workflowData.prospectCount || 0);
          console.log('  • Campaign ID:', workflowData.campaignData?.campaignId);
          console.log('  • CSV Data:', workflowData.csvData ? 'Available' : 'Missing');
          console.log('  • AI Model:', enrichmentConfig?.selectedModel?.name || 'Not specified');

          return (
            <BeginEnrichmentStep
              prospectCount={workflowData.prospectCount || 0}
              campaignId={workflowData.campaignData?.campaignId}
              csvFileInfo={workflowData.csvData}
              enrichmentConfig={enrichmentConfig}
              stepData={workflowData}
              onStepComplete={handleStepComplete}
              onError={handleStepError}
              disabled={isLoading}
            />
          );
        case 4:
          console.log('[SimpleWorkflow] Rendering Step 4 - Email Generation');
          console.log('[SimpleWorkflow] Workflow data available:', !!workflowData);
          console.log('[SimpleWorkflow] Enrichment data structure:', workflowData.enrichmentData);

          // If email generation has started, show the EmailGenerationStep component
          if (workflowData.emailGenerationJobId) {
            return (
              <EmailGenerationStep
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
                (currentStep === 1 && !workflowData.csvData) ||
                (currentStep === 3 && !workflowData.enrichmentResults)
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
