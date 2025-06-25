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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Activity,
  AlertTriangle,
  XCircle,
  Loader2,
  Settings2,
  Mail,
  Eye,
  Download,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import EmailGenerationService from '@/services/emailGenerationService';
import type {
  EmailGenerationStatus,
  EmailGenerationJobStatus,
} from '@/services/emailGenerationService';
import { apiClient } from '@/services/api';

interface EmailGenerationStepProps {
  workflowSessionId?: string;
  prospectCount?: number;
  campaignId?: number;
  emailGenerationJobId?: string;
  enrichmentData?: any; // Add enrichment data to extract LLM selection
  onStepComplete?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function EmailGenerationStep({
  workflowSessionId,
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
  const [prospects, setProspects] = useState<EmailGenerationStatus[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [, setIsCompleted] = useState(false);
  const [, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'prospects' | 'errors' | 'settings'
  >('overview');

  // Email generation settings
  const [showEmailGenerationSettings, setShowEmailGenerationSettings] =
    useState(false);
  const [emailGenerationParallelism, setEmailGenerationParallelism] = useState<
    number[]
  >([2]);
  const [isEmailGenerationStarting, setIsEmailGenerationStarting] =
    useState(false);

  // SSE connection for real-time updates
  const eventSourceRef = useRef<EventSource | null>(null);

  // Function to get LLM model selection from workflow session (similar to BeginEnrichmentStep)
  const getLLMModelSelection = async (): Promise<{
    aiProvider: 'gemini' | 'openrouter';
    llmModelId?: string;
  }> => {
    console.log('🔍 [EmailGenerationStep] Getting LLM model selection...');

    // Method 1: Try to get from workflow session configuration (most reliable)
    if (workflowSessionId && workflowSessionId !== 'local-session') {
      try {
        console.log(
          '🔍 [EmailGenerationStep] Attempting to get LLM model from workflow session configuration...'
        );
        const response = await apiClient.get(
          `/api/workflow/sessions/${workflowSessionId}`
        );
        const data = await response.json();

        console.log(
          '🔍 [EmailGenerationStep] Workflow session API response:',
          data
        );

        if (
          data.success &&
          data.data?.session?.configurationData?.campaignSettings?.selectedModel?.id
        ) {
          const llmModelId = data.data.session.configurationData.campaignSettings.selectedModel.id;
          console.log(
            '✅ [EmailGenerationStep] Found LLM model from workflow session:',
            { llmModelId }
          );

          // Convert LLM model ID to aiProvider
          if (llmModelId === 'gemini-2.0-flash') {
            return { aiProvider: 'gemini', llmModelId: llmModelId };
          } else if (llmModelId.startsWith('openrouter-')) {
            return { aiProvider: 'openrouter', llmModelId: llmModelId };
          } else {
            return { aiProvider: 'openrouter', llmModelId: llmModelId };
          }
        }
      } catch (error) {
        console.warn(
          '⚠️ [EmailGenerationStep] Failed to get LLM model from workflow session:',
          error
        );
      }
    }

    // Method 2: Try to get from enrichment data (fallback)
    if (enrichmentData?.data?.selectedModel?.id) {
      const llmModelId = enrichmentData.data.selectedModel.id;
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

    // Method 3: Try global function (last resort)
    if (typeof window !== 'undefined' && (window as any).__campaignStepData) {
      try {
        const campaignData = (window as any).__campaignStepData();
        if (campaignData?.selectedModel?.id) {
          const llmModelId = campaignData.selectedModel.id;
          console.log(
            '✅ [EmailGenerationStep] Found LLM model from global function:',
            { llmModelId }
          );

          if (llmModelId === 'gemini-2.0-flash') {
            return { aiProvider: 'gemini', llmModelId };
          } else {
            return { aiProvider: 'openrouter', llmModelId };
          }
        }
      } catch (error) {
        console.warn(
          '⚠️ [EmailGenerationStep] Failed to get LLM model from global function:',
          error
        );
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
      setProspects(jobData.data.prospects || []);
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

    // Get LLM model selection using the new robust method
    const { aiProvider: selectedAiProvider, llmModelId: selectedLLMModelId } =
      await getLLMModelSelection();

    console.log('🔍 [EmailGenerationStep] LLM model selection result:', {
      selectedAiProvider,
      selectedLLMModelId,
      isLLMModelIdTruthy: !!selectedLLMModelId,
      typeOfLLMModelId: typeof selectedLLMModelId
    });

    setIsEmailGenerationStarting(true);
    setError(null);

    try {
      console.log('🚀 Starting email generation with:', {
        campaignId,
        parallelism: emailGenerationParallelism[0],
        selectedAiProvider,
        selectedLLMModelId,
      });

      // Create email generation jobs - Always include llmModelId
      const config = {
        campaignId,
        workflowSessionId: `workflow-${Date.now()}`,
        configuration: {
          parallelism: emailGenerationParallelism[0] || 2,
          aiProvider: selectedAiProvider,
          llmModelId: selectedLLMModelId || 'openrouter-o1-mini', // Always include, with fallback
        },
      };

      console.log('📤 [EmailGenerationStep] Final config being sent:', config);

      const responseData =
        await EmailGenerationService.createEmailGenerationJob(config);

      console.log('✅ Email generation job created:', responseData.data);

      setJobStatus(responseData.data);
      setProspects(responseData.data.prospects || []);
      setIsStarted(true);

      // Set up SSE connection for real-time updates
      setupSSEConnection(responseData.data.id);

      // Call onStepComplete to mark this step as done
      if (onStepComplete) {
        onStepComplete({
          step: 'EMAIL_GENERATION',
          emailGenerationJobId: responseData.data.id,
          data: responseData.data,
        });
      }
    } catch (error) {
      console.error('❌ Failed to start email generation:', error);
      setError(
        `Failed to start email generation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsEmailGenerationStarting(false);
    }
  };

  const setupSSEConnection = (jobId: string) => {
    try {
      eventSourceRef.current =
        EmailGenerationService.createEmailGenerationJobSSE(
          jobId,
          event => {
            try {
              const data = JSON.parse(event.data);
              console.log('📡 SSE Email Generation Event received:', data);
              console.log('📡 Event type:', data.type);
              console.log('📡 Event data keys:', Object.keys(data));

              switch (data.type) {
                case 'job_status':
                  // Update job status from backend (matching enrichment pattern)
                  if (data.payload) {
                    setJobStatus(prev => ({
                      ...prev,
                      ...data.payload,
                    }));

                    // Update prospects from job
                    if (data.payload.prospects) {
                      setProspects(data.payload.prospects);
                    }
                  }
                  break;

                case 'prospect_update':
                  // Update specific prospect
                  if (data.payload) {
                    setProspects(prev =>
                      prev.map(p =>
                        p.id.toString() === data.payload.id.toString()
                          ? { ...p, ...data.payload }
                          : p
                      )
                    );
                  }
                  break;

                case 'job_complete':
                  // Job completed successfully (matching enrichment pattern)
                  console.log(
                    '🎉 Email generation job completed successfully!'
                  );
                  if (data.payload) {
                    setJobStatus(data.payload);
                    setIsCompleted(true);
                    onStepComplete?.(data.payload);
                  }
                  break;

                case 'job_complete_with_errors':
                  // Job completed but with some failures (matching enrichment pattern)
                  console.log('⚠️ Email generation job completed with errors');
                  if (data.payload) {
                    setJobStatus(data.payload);
                    setError(
                      `Email generation completed with issues: ${data.payload.message}`
                    );
                    setIsCompleted(true);
                    // Still call onStepComplete but with warning context
                    onStepComplete?.({
                      ...data.payload,
                      hasErrors: true,
                      errorMessage: data.payload.message,
                    });
                  }
                  break;

                case 'job_failed':
                  // Job failed completely (matching enrichment pattern)
                  console.error('❌ Email generation job failed');
                  if (data.payload) {
                    setJobStatus(data.payload);
                    setError(
                      `Email generation failed: ${data.payload.message}`
                    );
                    onError?.(data.payload.message);
                  }
                  break;

                case 'email-generation':
                  // Handle individual prospect email generation updates (legacy)
                  console.log(
                    '📧 Email generation update for prospect:',
                    data.prospectId,
                    'status:',
                    data.status
                  );
                  if (data.status === 'completed') {
                    setJobStatus(prev => {
                      if (!prev) return prev;
                      const newCompleted = (prev.completedProspects || 0) + 1;
                      const newProgress = Math.round(
                        (newCompleted / prev.totalProspects) * 100
                      );
                      return {
                        ...prev,
                        completedProspects: newCompleted,
                        progress: newProgress,
                        status:
                          newProgress === 100
                            ? ('completed' as const)
                            : ('running' as const),
                      };
                    });
                  }
                  break;

                case 'error':
                  // Handle errors
                  console.error(
                    '❌ Email generation error:',
                    data.payload?.message
                  );
                  setError(data.payload?.message || 'Email generation error');
                  break;
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          },
          error => {
            console.error('SSE connection error:', error);
            setError('Lost connection to server. Reconnecting...');
            // Try to reconnect after a delay
            setTimeout(() => {
              if (jobStatus?.id) {
                setupSSEConnection(jobStatus.id);
              }
            }, 3000);
          }
        );
    } catch (err) {
      console.error('Failed to setup SSE connection:', err);
      setError('Failed to establish real-time connection');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      case 'pending':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4' />;
      case 'failed':
        return <XCircle className='h-4 w-4' />;
      case 'processing':
        return <Loader2 className='h-4 w-4 animate-spin' />;
      case 'pending':
        return <Clock className='h-4 w-4' />;
      default:
        return <Clock className='h-4 w-4' />;
    }
  };

  const renderJobOverview = () => (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Mail className='h-5 w-5' />
            Email Generation Progress
          </CardTitle>
          <CardDescription>
            {jobStatus
              ? `Generating personalized emails for ${jobStatus.totalProspects} prospects`
              : `Ready to generate emails for ${prospectCount} prospects`}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Progress Bar */}
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span>Progress</span>
              <span>{jobStatus?.progress || 0}%</span>
            </div>
            <Progress value={jobStatus?.progress || 0} className='w-full' />
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>{jobStatus?.completedProspects || 0} completed</span>
              <span>{jobStatus?.totalProspects || prospectCount} total</span>
            </div>
          </div>

          {/* Status Cards */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card className='p-3'>
              <div className='flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-500' />
                <div>
                  <div className='text-2xl font-bold text-green-600'>
                    {jobStatus?.completedProspects || 0}
                  </div>
                  <div className='text-xs text-muted-foreground'>Completed</div>
                </div>
              </div>
            </Card>

            <Card className='p-3'>
              <div className='flex items-center gap-2'>
                <Loader2 className='h-4 w-4 text-blue-500' />
                <div>
                  <div className='text-2xl font-bold text-blue-600'>
                    {jobStatus?.processedProspects || 0}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    Processing
                  </div>
                </div>
              </div>
            </Card>

            <Card className='p-3'>
              <div className='flex items-center gap-2'>
                <XCircle className='h-4 w-4 text-red-500' />
                <div>
                  <div className='text-2xl font-bold text-red-600'>
                    {jobStatus?.failedProspects || 0}
                  </div>
                  <div className='text-xs text-muted-foreground'>Failed</div>
                </div>
              </div>
            </Card>

            <Card className='p-3'>
              <div className='flex items-center gap-2'>
                <Users className='h-4 w-4 text-gray-500' />
                <div>
                  <div className='text-2xl font-bold text-gray-600'>
                    {jobStatus?.totalProspects || prospectCount}
                  </div>
                  <div className='text-xs text-muted-foreground'>Total</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons */}
          {!isStarted && (
            <div className='flex justify-center gap-4 pt-4'>
              {/* Email Generation Settings Dialog */}
              <Dialog
                open={showEmailGenerationSettings}
                onOpenChange={setShowEmailGenerationSettings}
              >
                <DialogTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='gap-2'
                    title='Email Generation Settings'
                  >
                    <Settings className='h-4 w-4' />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[425px]'>
                  <DialogHeader>
                    <DialogTitle>Email Generation Settings</DialogTitle>
                    <DialogDescription>
                      Configure how emails will be generated for your prospects.
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
                onClick={startEmailGeneration}
                disabled={isEmailGenerationStarting || disabled}
              >
                {isEmailGenerationStarting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Mail className='h-4 w-4' />
                )}
                Start Email Generation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderProspectDetails = () => (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Prospect Email Generation</h3>
        <div className='text-sm text-muted-foreground'>
          Showing {prospects.length} prospects
        </div>
      </div>

      <div className='space-y-2'>
        {prospects.map(prospect => (
          <Card key={prospect.id} className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div
                  className={`flex items-center gap-2 ${getStatusColor(prospect.status)}`}
                >
                  {getStatusIcon(prospect.status)}
                </div>
                <div>
                  <div className='font-medium'>{prospect.name}</div>
                  <div className='text-sm text-muted-foreground'>
                    {prospect.title} at {prospect.company}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {prospect.email}
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-4'>
                <Badge variant='outline'>{prospect.progress}% Complete</Badge>

                {prospect.generatedEmail && (
                  <Badge variant='secondary' className='text-xs'>
                    Email Generated ✓
                  </Badge>
                )}

                <div className='w-20'>
                  <Progress value={prospect.progress} className='h-2' />
                </div>

                <div className='text-right text-sm'>
                  <div
                    className={`font-medium ${getStatusColor(prospect.status)}`}
                  >
                    {prospect.status.charAt(0).toUpperCase() +
                      prospect.status.slice(1)}
                  </div>
                  {prospect.processingTime && (
                    <div className='text-xs text-muted-foreground'>
                      {(prospect.processingTime / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
            </div>

            {prospect.generatedEmail && (
              <div className='mt-3 pt-3 border-t'>
                <div className='text-sm'>
                  <div className='font-medium'>
                    Subject: {prospect.generatedEmail.subject}
                  </div>
                  <div className='text-muted-foreground mt-1'>
                    {prospect.generatedEmail.preview}
                  </div>
                </div>
              </div>
            )}

            {prospect.errors && prospect.errors.length > 0 && (
              <div className='mt-2 pt-2 border-t'>
                <div className='text-sm text-red-600'>
                  Errors: {prospect.errors.join(', ')}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderErrors = () => (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Errors & Issues</h3>
        <Badge variant='destructive' className='text-sm'>
          {jobStatus?.errors?.length || 0} total errors
        </Badge>
      </div>

      {(jobStatus?.errors?.length || 0) === 0 ? (
        <Card className='p-8 text-center'>
          <CheckCircle className='h-12 w-12 mx-auto text-green-500 mb-4' />
          <h3 className='font-semibold mb-2'>No Errors</h3>
          <p className='text-sm text-muted-foreground'>
            Email generation is running smoothly without any errors.
          </p>
        </Card>
      ) : (
        <div className='space-y-2'>
          {jobStatus?.errors?.map(error => (
            <Alert
              key={error.id}
              variant={error.severity === 'error' ? 'destructive' : 'default'}
            >
              {error.severity === 'error' ? (
                <AlertCircle className='h-4 w-4' />
              ) : (
                <AlertTriangle className='h-4 w-4' />
              )}
              <AlertDescription>
                <div className='flex justify-between items-start'>
                  <div>
                    <div className='font-medium'>{error.message}</div>
                    {error.prospectId && (
                      <div className='text-sm text-muted-foreground'>
                        Prospect: {error.prospectId}
                      </div>
                    )}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold mb-4'>
          Email Generation Configuration
        </h3>
        <div className='space-y-6'>
          <div className='space-y-2'>
            <Label htmlFor='parallelism'>
              Parallelism: {emailGenerationParallelism[0]} emails at once
            </Label>
            <Slider
              id='parallelism'
              min={1}
              max={10}
              step={1}
              value={emailGenerationParallelism}
              onValueChange={setEmailGenerationParallelism}
              className='w-full'
              disabled={isStarted}
            />
            <p className='text-sm text-muted-foreground'>
              Number of emails to generate simultaneously. Higher values
              increase speed but use more AI resources.
            </p>
          </div>
        </div>
      </div>

      {isStarted && (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            Configuration changes cannot be applied to a running job. Wait for
            completion to modify settings for the next run.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Header */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-bold text-gray-900'>Email Generation</h2>
        <p className='text-gray-600'>
          Generate personalized AI-powered emails for{' '}
          {jobStatus?.totalProspects || prospectCount} prospects
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs
        value={selectedTab}
        onValueChange={(value: any) => setSelectedTab(value)}
      >
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview' className='gap-2'>
            <Activity className='h-4 w-4' />
            Overview
          </TabsTrigger>
          <TabsTrigger value='prospects' className='gap-2'>
            <Users className='h-4 w-4' />
            Prospects
          </TabsTrigger>
          <TabsTrigger value='errors' className='gap-2'>
            <AlertTriangle className='h-4 w-4' />
            Errors
          </TabsTrigger>
          <TabsTrigger value='settings' className='gap-2'>
            <Settings2 className='h-4 w-4' />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='mt-6'>
          {renderJobOverview()}
        </TabsContent>

        <TabsContent value='prospects' className='mt-6'>
          {renderProspectDetails()}
        </TabsContent>

        <TabsContent value='errors' className='mt-6'>
          {renderErrors()}
        </TabsContent>

        <TabsContent value='settings' className='mt-6'>
          {renderSettings()}
        </TabsContent>
      </Tabs>

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
}
