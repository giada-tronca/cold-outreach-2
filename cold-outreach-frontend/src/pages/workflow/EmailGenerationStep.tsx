import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Settings2,
  Mail,
  Eye,
  Download,
  ExternalLink,
} from 'lucide-react';

import EmailGenerationService from '@/services/emailGenerationService';
import type { EmailGenerationJobStatus } from '@/services/emailGenerationService';
// import { apiClient } from '@/services/api';

interface EmailGenerationStepProps {
  prospectCount?: number;
  campaignId?: number;
  emailGenerationJobId?: string;
  enrichmentData?: any; // Contains AI model selection from Step 3
  onStepComplete?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function EmailGenerationStep({
  prospectCount = 0,
  campaignId,
  emailGenerationJobId,
  enrichmentData,
  onStepComplete,
  onError,
  disabled = false,
}: EmailGenerationStepProps) {
  const [jobStatus, setJobStatus] = useState<EmailGenerationJobStatus | null>(
    null
  );

  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvDownloadUrl, setCsvDownloadUrl] = useState<string | null>(null);

  // Email generation settings
  const [emailGenerationParallelism, setEmailGenerationParallelism] = useState<
    number[]
  >([2]);
  const [isEmailGenerationStarting, setIsEmailGenerationStarting] =
    useState(false);

  // SSE connection for real-time updates
  const eventSourceRef = useRef<EventSource | null>(null);

  // Use consistent userId - TODO: Get from auth context
  const userId = 'default-user';

  // Function to generate completion data and CSV
  const generateCompletionData = async (finalJobStatus: EmailGenerationJobStatus) => {
    try {
      console.log('[EmailGenerationStep] Generating completion data...');

      // Calculate success rate
      const successRate = finalJobStatus.totalProspects > 0
        ? Math.round((finalJobStatus.completedProspects / finalJobStatus.totalProspects) * 100)
        : 0;

      console.log(`[EmailGenerationStep] Success rate: ${successRate}%`);
      console.log(`[EmailGenerationStep] Total: ${finalJobStatus.totalProspects}, Success: ${finalJobStatus.completedProspects}, Failed: ${finalJobStatus.failedProspects}`);

      // Generate CSV with all prospect data + email content
      // This will be handled by the backend when we request the final job status
      const csvUrl = await EmailGenerationService.getEmailGenerationJobStatus(finalJobStatus.id);
      if (csvUrl.data.csvDownloadUrl) {
        setCsvDownloadUrl(csvUrl.data.csvDownloadUrl);
        console.log('[EmailGenerationStep] CSV download URL set:', csvUrl.data.csvDownloadUrl);
      }

      // Update job status with final data
      setJobStatus(prev => ({
        ...finalJobStatus,
        csvDownloadUrl: csvUrl.data.csvDownloadUrl || prev?.csvDownloadUrl
      }));

    } catch (error) {
      console.error('[EmailGenerationStep] Error generating completion data:', error);
      setError('Failed to generate completion data');
    }
  };

  // Function to get LLM model selection from stepData
  const getLLMModelSelection = (): {
    aiProvider: 'gemini' | 'openrouter';
    llmModelId?: string;
  } => {
    console.log(
      '🔍 [EmailGenerationStep] Getting LLM model selection from stepData...'
    );
    console.log(
      '🔍 [EmailGenerationStep] Available enrichmentData:',
      enrichmentData
    );

    // Method 1: Get from enrichmentSettings.selectedModel (main path)
    if (enrichmentData?.enrichmentSettings?.selectedModel?.id) {
      const llmModelId = enrichmentData.enrichmentSettings.selectedModel.id;
      console.log(
        '✅ [EmailGenerationStep] Found LLM model from enrichmentSettings:',
        llmModelId
      );

      if (llmModelId === 'gemini-2.0-flash') {
        return { aiProvider: 'gemini', llmModelId };
      } else {
        return { aiProvider: 'openrouter', llmModelId };
      }
    }

    // Method 2: Get from enrichment data (Step 3 data)
    if (enrichmentData?.selectedModel?.id) {
      const llmModelId = enrichmentData.selectedModel.id;
      console.log(
        '✅ [EmailGenerationStep] Found LLM model from enrichment data:',
        llmModelId
      );

      if (llmModelId === 'gemini-2.0-flash') {
        return { aiProvider: 'gemini', llmModelId };
      } else {
        return { aiProvider: 'openrouter', llmModelId };
      }
    }

    // Method 3: Try to get from enrichmentData.data structure
    if (enrichmentData?.data?.selectedModel?.id) {
      const llmModelId = enrichmentData.data.selectedModel.id;
      console.log(
        '✅ [EmailGenerationStep] Found LLM model from enrichment data.data:',
        llmModelId
      );

      if (llmModelId === 'gemini-2.0-flash') {
        return { aiProvider: 'gemini', llmModelId };
      } else {
        return { aiProvider: 'openrouter', llmModelId };
      }
    }

    // Default fallback with explicit model
    console.log(
      '⚠️ [EmailGenerationStep] No LLM model selection found, using default OpenRouter with o1-mini'
    );
    return { aiProvider: 'openrouter', llmModelId: 'openrouter-o1-mini' };
  };

  // Load email generation job if provided
  useEffect(() => {
    if (emailGenerationJobId) {
      loadEmailGenerationJob();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [emailGenerationJobId]);

  const loadEmailGenerationJob = async () => {
    if (!emailGenerationJobId) return;

    try {
      setIsLoading(true);
      const jobData =
        await EmailGenerationService.getEmailGenerationJobStatus(
          emailGenerationJobId
        );
      setJobStatus(jobData.data);
      // setProspects(jobData.data.prospects || []); // Simplified UI doesn't need prospect details
      setIsStarted(true);
      setError(null);

      // Set up SSE connection for real-time updates
      if (jobData.data.status === 'running') {
        setupSSEConnection(emailGenerationJobId);
      }
    } catch (err) {
      console.error('Error loading email generation job:', err);
      setError('Failed to load email generation job status');
    } finally {
      setIsLoading(false);
    }
  };

  const startEmailGeneration = async () => {
    if (!campaignId || typeof campaignId !== 'number') {
      setError('Campaign ID is required for email generation');
      return;
    }

    // Get LLM model selection from stepData
    const { aiProvider: selectedAiProvider, llmModelId: selectedLLMModelId } =
      getLLMModelSelection();

    console.log('🔍 [EmailGenerationStep] LLM model selection result:', {
      selectedAiProvider,
      selectedLLMModelId,
      isLLMModelIdTruthy: !!selectedLLMModelId,
      typeOfLLMModelId: typeof selectedLLMModelId,
    });

    setIsEmailGenerationStarting(true);
    setError(null);

    try {
      const config: any = {
        campaignId,
        configuration: {
          aiProvider: selectedAiProvider,
          parallelism: emailGenerationParallelism[0] || 2,
        },
      };

      if (selectedLLMModelId) {
        config.configuration.llmModelId = selectedLLMModelId;
      }

      const response =
        await EmailGenerationService.createEmailGenerationJob(config);

      console.log(
        '✅ [EmailGenerationStep] Email generation started:',
        response
      );

      if (response.success && response.data?.id) {
        setIsStarted(true);
        setJobStatus(response.data);

        // Set up SSE connection for real-time updates
        setupSSEConnection(response.data.id);

        // Call onStepComplete if provided
        if (onStepComplete) {
          onStepComplete({
            emailGenerationJobId: response.data.id,
            jobStatus: response.data,
          });
        }
      } else {
        throw new Error('Failed to create email generation job');
      }
    } catch (err) {
      console.error(
        '❌ [EmailGenerationStep] Error starting email generation:',
        err
      );
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start email generation';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsEmailGenerationStarting(false);
    }
  };

  const setupSSEConnection = (jobId: string) => {
    try {
      console.log(
        '📡 [EmailGenerationStep] Setting up SSE connection for job:',
        jobId
      );

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Use user-specific SSE connection like enrichment step
      eventSourceRef.current = EmailGenerationService.createSSEConnection(
        userId,
        event => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 [EmailGenerationStep] SSE event received:', data.type, data);

            switch (data.type) {
              case 'email-generation':
                // Handle ONLY final email completion/failure (no intermediate updates)
                console.log(
                  `[EmailGenerationStep] Email final result: ${data.prospectId} - ${data.status}`
                );

                // Only process completed or error status (final states)
                if (data.status === 'completed' || data.status === 'error') {
                  // Update job status counters
                  setJobStatus(prev => {
                    if (!prev) return prev;

                    const updatedStatus = { ...prev };

                    if (data.status === 'completed') {
                      updatedStatus.completedProspects = (prev.completedProspects || 0) + 1;
                    } else if (data.status === 'error') {
                      updatedStatus.failedProspects = (prev.failedProspects || 0) + 1;
                    }

                    const processed = (updatedStatus.completedProspects || 0) + (updatedStatus.failedProspects || 0);
                    // Cap progress at 100% to fix any overflow issues
                    updatedStatus.progress = Math.min(
                      100,
                      prev.totalProspects > 0
                        ? Math.round((processed / prev.totalProspects) * 100)
                        : 0
                    );

                    // Check if all emails are generated
                    if (processed >= prev.totalProspects) {
                      console.log('[EmailGenerationStep] All emails processed, generating CSV...');

                      // Set completion status
                      updatedStatus.status = updatedStatus.failedProspects === 0 ? 'completed' : 'completed';
                      setIsCompleted(true);

                      // Generate CSV and show completion UI
                      generateCompletionData(updatedStatus);
                    }

                    return updatedStatus;
                  });
                }
                break;

              case 'connected':
                console.log('[EmailGenerationStep] SSE connection established');
                break;

              default:
                console.log('[EmailGenerationStep] Unhandled SSE event type:', data.type);
                break;
            }
          } catch (parseError) {
            console.error(
              '❌ [EmailGenerationStep] Error parsing SSE data:',
              parseError
            );
          }
        },
        error => {
          console.error(
            '❌ [EmailGenerationStep] SSE connection error:',
            error
          );
          setError('Connection lost. Please refresh the page.');
        }
      );
    } catch (err) {
      console.error('❌ [EmailGenerationStep] Error setting up SSE:', err);
      setError('Failed to establish real-time connection');
    }
  };

  const renderInitialView = () => (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Page Title */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-bold text-gray-900'>Email Generation</h2>
        <p className='text-gray-600'>
          Generate your AI powered emails for {prospectCount} prospects
        </p>
      </div>

      {/* Success Message - Small alert at top */}
      <Alert className='border-green-200 bg-green-50'>
        <CheckCircle className='h-4 w-4 text-green-600' />
        <AlertDescription className='text-green-800'>
          Prospects were enriched and stored in prospects, please continue with
          email generation.
        </AlertDescription>
      </Alert>

      {/* View Prospects Link */}
      <div className='flex justify-center'>
        <Button
          variant='outline'
          className='gap-2'
          onClick={() => window.open('/prospects', '_blank')}
        >
          <Eye className='h-4 w-4' />
          View Prospects
          <ExternalLink className='h-3 w-3' />
        </Button>
      </div>

      {/* Email Generation Settings Section */}
      <Card className='w-full'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings2 className='h-5 w-5' />
            Email Generation Settings
          </CardTitle>
          <CardDescription>
            Configure how the email generation process will run
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='space-y-2'>
              <Label>Parallel Processing (1-10)</Label>
              <Slider
                value={emailGenerationParallelism}
                onValueChange={setEmailGenerationParallelism}
                max={10}
                min={1}
                step={1}
              />
              <p className='text-sm text-muted-foreground'>
                Current: {emailGenerationParallelism[0]} emails at once
              </p>
            </div>
          </div>

          {/* Start Email Generation Button - Bottom Right */}
          <div className='flex justify-end pt-4'>
            <Button
              onClick={startEmailGeneration}
              disabled={disabled || isEmailGenerationStarting}
              className='flex items-center gap-2'
              size='lg'
            >
              {isEmailGenerationStarting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Mail className='h-4 w-4' />
              )}
              Start Email Generation
            </Button>
          </div>

          {error && (
            <Alert variant='destructive' className='mt-4'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderProgressView = () => (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Page Title */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-bold text-gray-900'>Email Generation</h2>
        <p className='text-gray-600'>
          Generate your AI powered emails for {prospectCount} prospects
        </p>
      </div>

      {/* Simple Progress Bar */}
      <Card className='w-full'>
        <CardContent className='pt-6'>
          <div className='space-y-4'>
            <div className='flex justify-between text-sm'>
              <span>Progress</span>
              <span>{Math.round(jobStatus?.progress || 0)}%</span>
            </div>
            <Progress value={jobStatus?.progress || 0} className='w-full' />
          </div>
        </CardContent>
      </Card>

      {/* Success & Failed Cards */}
      <div className='grid grid-cols-2 gap-4'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center space-x-2'>
              <CheckCircle className='h-5 w-5 text-green-500' />
              <div>
                <p className='text-sm font-medium'>Generated</p>
                <p className='text-2xl font-bold text-green-600'>
                  {jobStatus?.completedProspects || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center space-x-2'>
              <XCircle className='h-5 w-5 text-red-500' />
              <div>
                <p className='text-sm font-medium'>Failed</p>
                <p className='text-2xl font-bold text-red-600'>
                  {jobStatus?.failedProspects || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Section */}
      {isCompleted && (
        <Card className='w-full border-green-200 bg-green-50'>
          <CardContent className='pt-6'>
            <div className='text-center space-y-4'>
              <CheckCircle className='h-12 w-12 text-green-600 mx-auto' />
              <h3 className='text-lg font-semibold text-green-800'>
                Email Generation Complete!
              </h3>
              <p className='text-green-700'>
                Successfully generated {jobStatus?.completedProspects || 0} emails
                {(jobStatus?.failedProspects || 0) > 0 &&
                  ` with ${jobStatus?.failedProspects} failed`}
              </p>

              <div className='flex justify-center gap-4 pt-4'>
                {(csvDownloadUrl || jobStatus?.csvDownloadUrl) && (
                  <Button
                    onClick={() => window.open(csvDownloadUrl || jobStatus?.csvDownloadUrl, '_blank')}
                    className='gap-2'
                    variant='outline'
                  >
                    <Download className='h-4 w-4' />
                    Download Email Results CSV
                  </Button>
                )}

                <Button
                  onClick={() => window.location.href = '/cold-outreach/dashboard'}
                  className='gap-2'
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Main render logic
  if (!isStarted) {
    return renderInitialView();
  }

  return renderProgressView();
}
