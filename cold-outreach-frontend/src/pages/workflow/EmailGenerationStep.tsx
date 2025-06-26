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
} from 'lucide-react';

import EmailGenerationService from '@/services/emailGenerationService';
import type {
  EmailGenerationJobStatus,
} from '@/services/emailGenerationService';
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
  const [, setIsCompleted] = useState(false);
  const [, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email generation settings
  const [emailGenerationParallelism, setEmailGenerationParallelism] = useState<
    number[]
  >([2]);
  const [isEmailGenerationStarting, setIsEmailGenerationStarting] =
    useState(false);

  // SSE connection for real-time updates
  const eventSourceRef = useRef<EventSource | null>(null);

  // Function to get LLM model selection from stepData
  const getLLMModelSelection = (): {
    aiProvider: 'gemini' | 'openrouter';
    llmModelId?: string;
  } => {
    console.log('🔍 [EmailGenerationStep] Getting LLM model selection from stepData...');
    console.log('🔍 [EmailGenerationStep] Available enrichmentData:', enrichmentData);

    // Method 1: Get from enrichmentSettings.selectedModel (main path)
    if (enrichmentData?.enrichmentSettings?.selectedModel?.id) {
      const llmModelId = enrichmentData.enrichmentSettings.selectedModel.id;
      console.log('✅ [EmailGenerationStep] Found LLM model from enrichmentSettings:', llmModelId);

      if (llmModelId === 'gemini-2.0-flash') {
        return { aiProvider: 'gemini', llmModelId };
      } else {
        return { aiProvider: 'openrouter', llmModelId };
      }
    }

    // Method 2: Get from enrichment data (Step 3 data)
    if (enrichmentData?.selectedModel?.id) {
      const llmModelId = enrichmentData.selectedModel.id;
      console.log('✅ [EmailGenerationStep] Found LLM model from enrichment data:', llmModelId);

      if (llmModelId === 'gemini-2.0-flash') {
        return { aiProvider: 'gemini', llmModelId };
      } else {
        return { aiProvider: 'openrouter', llmModelId };
      }
    }

    // Method 3: Try to get from enrichmentData.data structure
    if (enrichmentData?.data?.selectedModel?.id) {
      const llmModelId = enrichmentData.data.selectedModel.id;
      console.log('✅ [EmailGenerationStep] Found LLM model from enrichment data.data:', llmModelId);

      if (llmModelId === 'gemini-2.0-flash') {
        return { aiProvider: 'gemini', llmModelId };
      } else {
        return { aiProvider: 'openrouter', llmModelId };
      }
    }

    // Default fallback with explicit model
    console.log('⚠️ [EmailGenerationStep] No LLM model selection found, using default OpenRouter with o1-mini');
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
      typeOfLLMModelId: typeof selectedLLMModelId
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

      const response = await EmailGenerationService.createEmailGenerationJob(config);

      console.log('✅ [EmailGenerationStep] Email generation started:', response);

      if (response.success && response.data?.id) {
        setIsStarted(true);
        setJobStatus(response.data);

        // Set up SSE connection for real-time updates
        setupSSEConnection(response.data.id);

        // Notify parent component
        if (onStepComplete) {
          onStepComplete({
            emailGenerationJobId: response.data.id,
            emailGenerationSettings: {
              parallelism: emailGenerationParallelism[0],
              aiProvider: selectedAiProvider,
              llmModelId: selectedLLMModelId,
            },
          });
        }
      } else {
        throw new Error(response.error || 'Failed to start email generation');
      }
    } catch (err) {
      console.error('❌ [EmailGenerationStep] Email generation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start email generation';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsEmailGenerationStarting(false);
    }
  };

  const setupSSEConnection = (jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/email-generation/stream/${jobId}`
    );

    eventSource.onopen = () => {
      console.log('✅ [EmailGenerationStep] SSE connection opened for job:', jobId);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 [EmailGenerationStep] SSE message received:', data);

        switch (data.type) {
          case 'job-progress':
            setJobStatus(prev => prev ? {
              ...prev,
              ...data.status,
              progress: Math.min(100, data.progress || 100),
            } : null);
            break;

          case 'prospect-email-generated':
            // setProspects(prev => prev.map(prospect =>
            //   prospect.id === data.prospectId
            //     ? { ...prospect, ...data.prospect }
            //     : prospect
            // )); // Simplified UI doesn't need prospect details

            setJobStatus(prev => {
              if (!prev) return null;

              const updatedStatus = { ...prev };
              if (data.status === 'completed') {
                updatedStatus.completedProspects = (prev.completedProspects || 0) + 1;
              } else if (data.status === 'failed') {
                updatedStatus.failedProspects = (prev.failedProspects || 0) + 1;
              }

              const processed = (updatedStatus.completedProspects || 0) + (updatedStatus.failedProspects || 0);
              updatedStatus.progress = Math.min(100, prev.totalProspects > 0 ? Math.round((processed / prev.totalProspects) * 100) : 0);

              if (processed >= prev.totalProspects) {
                updatedStatus.status = 'completed';
                updatedStatus.progress = 100;
                updatedStatus.message = updatedStatus.failedProspects === 0 ? 'Email generation completed successfully' : 'Email generation completed with some errors';
                setIsCompleted(true);
              }

              return updatedStatus;
            });
            break;

          case 'job-completed':
          case 'job-failed':
            setJobStatus(prev => prev ? { ...prev, ...data.status } : null);
            setIsCompleted(true);
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            break;

          default:
            console.log('🔍 [EmailGenerationStep] Unknown SSE message type:', data.type);
        }
      } catch (err) {
        console.error('❌ [EmailGenerationStep] Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ [EmailGenerationStep] SSE connection error:', error);
      eventSource.close();
    };

    eventSourceRef.current = eventSource;
  };

  // Render the initial view before email generation starts
  const renderInitialView = () => (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Page Title */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-bold text-gray-900'>AI Email Generation</h2>
        <p className='text-gray-600'>Configure and start the Email generation process for {prospectCount} prospects</p>
      </div>

      {/* Email Generation Settings Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Email Generation Settings
          </CardTitle>
          <CardDescription>
            Configure how the email generation process will run
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Parallel Processing (1-5)</Label>
            <Slider
              value={emailGenerationParallelism}
              onValueChange={setEmailGenerationParallelism}
              max={5}
              min={1}
              step={1}
            />
            <p className="text-sm text-muted-foreground">
              Current: {emailGenerationParallelism[0]} parallel processes
            </p>
          </div>

          {/* Start Email Generation Button - Bottom Right */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={startEmailGeneration}
              disabled={disabled || isEmailGenerationStarting}
              className="flex items-center gap-2"
              size="lg"
            >
              {isEmailGenerationStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Start Email Generation
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render the progress view after email generation starts
  const renderProgressView = () => (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Page Title */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-bold text-gray-900'>AI Email Generation</h2>
        <p className='text-gray-600'>Configure and start the Email generation process for {prospectCount} prospects</p>
      </div>

      {/* Simple Progress Bar */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(jobStatus?.progress || 0)}%</span>
            </div>
            <Progress value={jobStatus?.progress || 0} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Success & Failed Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Success</p>
                <p className="text-2xl font-bold text-green-600">{jobStatus?.completedProspects || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold text-red-600">{jobStatus?.failedProspects || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Final Completion */}
      {jobStatus?.status === 'completed' && (
        <Card className='p-6'>
          <div className='text-center space-y-4'>
            <CheckCircle className='h-12 w-12 mx-auto text-green-500' />
            <h3 className='text-xl font-semibold'>
              Email Generation Complete!
            </h3>
            <p className='text-muted-foreground'>
              Successfully generated emails for {jobStatus.completedProspects}{' '}
              out of {jobStatus.totalProspects} prospects
            </p>
            <div className='flex justify-center gap-4'>
              <Button variant='outline' className='gap-2'>
                <Eye className='h-4 w-4' />
                Review Emails
              </Button>
              {jobStatus.csvDownloadUrl && (
                <Button
                  className='gap-2'
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = jobStatus.csvDownloadUrl!;
                    link.download = '';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className='h-4 w-4' />
                  Download CSV
                </Button>
              )}
              <Button variant='outline' className='gap-2'>
                <Download className='h-4 w-4' />
                Export Campaign
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  return isStarted ? renderProgressView() : renderInitialView();
}
