import { apiClient, handleApiResponse } from './api';

// Types for email generation
export interface EmailGenerationStatus {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
  generatedEmail?: {
    subject: string;
    body: string;
    preview: string;
  };
  errors: string[];
  processingTime?: number;
  completedAt?: string;
}

export interface EmailGenerationError {
  id: string;
  message: string;
  prospectId?: string;
  timestamp: string;
  severity: 'error' | 'warning';
}

export interface EmailGenerationJobStatus {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  totalProspects: number;
  processedProspects: number;
  completedProspects: number;
  failedProspects: number;
  progress: number;
  message?: string;
  csvDownloadUrl?: string;
  configuration: {
    campaignId: number;
    parallelism: number;
    aiProvider: 'gemini' | 'openrouter';
    llmModelId?: string;
  };
  prospects: EmailGenerationStatus[];
  errors?: EmailGenerationError[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailGenerationConfig {
  aiProvider?: 'gemini' | 'openrouter';
  parallelism?: number;
  retryAttempts?: number;
  llmModelId?: string;
}

/**
 * Email Generation Service
 * Handles all email generation API calls and real-time updates
 */
export class EmailGenerationService {
  /**
   * Create email generation job with configuration
   */
  static async createEmailGenerationJob(config: {
    campaignId: number;
    workflowSessionId?: string;
    configuration: {
      aiProvider: 'gemini' | 'openrouter';
      parallelism: number;
      llmModelId?: string;
    };
  }) {
    console.log('📤 Sending email generation job request:', config);
    const response = await apiClient.post('/api/email-generation/jobs', config);
    return await handleApiResponse(response);
  }

  /**
   * Get email generation job status
   */
  static async getEmailGenerationJobStatus(jobId: string) {
    const response = await apiClient.get(`/api/email-generation/jobs/${jobId}`);
    return await handleApiResponse(response);
  }

  /**
   * Control email generation job (pause, resume, cancel)
   */
  static async controlEmailGenerationJob(
    jobId: string,
    action: 'pause' | 'resume' | 'cancel' | 'retry'
  ) {
    const response = await apiClient.post(
      `/api/email-generation/jobs/${jobId}/control`,
      { action }
    );
    return await handleApiResponse(response);
  }

  /**
   * Get generated emails for a campaign
   */
  static async getGeneratedEmails(campaignId: number) {
    const response = await apiClient.get(
      `/api/email-generation/emails?campaignId=${campaignId}`
    );
    return await handleApiResponse(response);
  }

  /**
   * Create SSE connection for real-time updates (general user stream)
   */
  static createSSEConnection(
    userId: string,
    onMessage: (event: MessageEvent) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const eventSource = new EventSource(`/api/jobs/stream/${userId}`);

    eventSource.onmessage = onMessage;

    eventSource.onerror = error => {
      console.error('SSE connection error:', error);
      if (onError) {
        onError(error);
      }
    };

    return eventSource;
  }

  /**
   * Create SSE connection specifically for email generation job tracking (matching enrichment pattern)
   */
  static createEmailGenerationJobSSE(
    jobId: string,
    onMessage: (event: MessageEvent) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const sseUrl = `/api/email-generation/jobs/${jobId}/progress`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = onMessage;
    eventSource.onerror =
      onError ||
      (error => {
        console.error('Email generation job SSE connection error:', error);
      });

    // Listen for specific job events (matching enrichment pattern)
    eventSource.addEventListener('job_status', onMessage);
    eventSource.addEventListener('prospect_update', onMessage);
    eventSource.addEventListener('job_complete', onMessage);
    eventSource.addEventListener('job_complete_with_errors', onMessage);
    eventSource.addEventListener('job_failed', onMessage);
    eventSource.addEventListener('error', onMessage);

    return eventSource;
  }

  /**
   * Transform backend email generation data to frontend format
   */
  static transformEmailGenerationData(backendData: any): EmailGenerationStatus {
    const result: EmailGenerationStatus = {
      id: backendData.id?.toString() || '',
      name: backendData.name || '',
      email: backendData.email || '',
      company: backendData.company || '',
      title: backendData.title || backendData.position || '',
      status: this.mapEmailGenerationStatus(backendData.status),
      progress: backendData.progress || 0,
      retryCount: backendData.retryCount || 0,
      errors: backendData.errors || [],
      processingTime: backendData.processingTime,
    };

    if (backendData.generatedEmail) {
      result.generatedEmail = {
        subject: backendData.generatedEmail.subject || '',
        body: backendData.generatedEmail.body || '',
        preview: backendData.generatedEmail.preview || '',
      };
    }

    return result;
  }

  /**
   * Map backend status to frontend status
   */
  private static mapEmailGenerationStatus(
    backendStatus: string
  ): EmailGenerationStatus['status'] {
    switch (backendStatus?.toLowerCase()) {
      case 'processing':
      case 'generating':
        return 'processing';
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      case 'pending':
      case 'queued':
      default:
        return 'pending';
    }
  }
}

export default EmailGenerationService;
