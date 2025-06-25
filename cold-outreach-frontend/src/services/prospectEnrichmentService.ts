import { apiClient, handleApiResponse } from './api';

// Types for prospect enrichment
export interface ProspectEnrichmentStatus {
  id: number;
  name: string;
  email: string;
  company: string;
  position: string;
  linkedinUrl?: string;
  status:
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'skipped';
  progress: number;
  enrichedData?: {
    linkedinSummary?: string;
    companySummary?: string;
    techStack?: any[];
    prospectAnalysisSummary?: string;
  };
  errors: string[];
  retryCount: number;
  processingTime?: number;
  completedAt?: string;
  batchId?: string;
}

export interface EnrichmentJobStatus {
  id: string;
  status:
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
  totalProspects: number;
  processedProspects: number;
  completedProspects: number;
  failedProspects: number;
  skippedProspects: number;
  progress: number;
  startedAt?: string;
  estimatedCompletion?: string;
  processingRate: number;
  configuration: {
    concurrency: number;
    retryAttempts: number;
    services: string[];
  };
  errors: Array<{
    id: string;
    message: string;
    severity: 'warning' | 'error';
    timestamp: string;
    prospectId?: string;
  }>;
  metrics: {
    averageProcessingTime: number;
    successRate: number;
    enrichmentQuality: number;
    costPerProspect: number;
    totalCost: number;
  };
}

export interface EnrichmentConfig {
  aiProvider?: 'gemini' | 'openrouter';
  services?: string[];
  concurrency?: number;
  retryAttempts?: number;
}

interface Prospect {
  name: string;
  email: string;
  company?: string;
  position?: string;
  [key: string]: any; // Allow for additional fields
}

interface EnrichmentJobConfig {
  workflowSessionId?: string;
  campaignId?: number;
  csvData?: Prospect[];
  filename?: string;
  configuration: {
    aiProvider: 'gemini' | 'openrouter';
    concurrency: number;
    retryAttempts: number;
    batchSize: number;
    services: string[];
  };
}

/**
 * Prospect Enrichment Service
 * Handles all prospect enrichment API calls
 */
export class ProspectEnrichmentService {
  /**
   * Get all prospects for a campaign, batch, or workflow session
   */
  static async getProspects(
    campaignId?: number,
    batchId?: number,
    workflowSessionId?: string,
    uploadSession?: string,
    csvFileInfo?: any
  ): Promise<ProspectEnrichmentStatus[]> {
    const params = new URLSearchParams();

    // If we have csvFileInfo but no prospects in the database yet,
    // return prospects from the CSV preview
    if (csvFileInfo?.preview?.rows && (!campaignId || !batchId)) {
      console.log('📊 Using CSV preview data for prospects');
      return csvFileInfo.preview.rows.map((row: any, index: number) => ({
        id: index + 1, // Temporary ID
        name: row[csvFileInfo.preview.headers.indexOf('name')] || '',
        email: row[csvFileInfo.preview.headers.indexOf('email')] || '',
        company: row[csvFileInfo.preview.headers.indexOf('company')] || '',
        position: row[csvFileInfo.preview.headers.indexOf('position')] || '',
        status: 'pending',
        progress: 0,
        errors: [],
        retryCount: 0,
        processingTime: 0
      }));
    }

    // Otherwise, try to get prospects from the database
    if (campaignId) params.append('campaignId', campaignId.toString());
    if (batchId) params.append('batchId', batchId.toString());
    if (workflowSessionId) params.append('workflowSessionId', workflowSessionId);
    if (uploadSession) params.append('uploadSession', uploadSession);

    const response = await apiClient.get(`/api/prospects?${params.toString()}`);
    const data = await handleApiResponse(response);

    // Transform backend data to frontend format
    return (
      data.data?.map((prospect: any) => ({
        id: prospect.id,
        name: prospect.name || '',
        email: prospect.email || '',
        company: prospect.company || '',
        position: prospect.position || '',
        linkedinUrl: prospect.linkedinUrl,
        status: this.mapProspectStatus(prospect.status),
        progress: this.calculateProgress(prospect),
        enrichedData: prospect.enrichment
          ? {
            linkedinSummary: prospect.enrichment.linkedinSummary,
            companySummary: prospect.enrichment.companySummary,
            techStack: prospect.enrichment.techStack,
            prospectAnalysisSummary: prospect.enrichment.prospectAnalysisSummary,
          }
          : undefined,
        errors: [],
        retryCount: 0,
        processingTime: 0,
        batchId: prospect.batchId?.toString(),
      })) || []
    );
  }

  /**
   * Start LinkedIn enrichment for a prospect
   */
  static async enrichWithLinkedIn(
    linkedinUrl: string,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ) {
    const response = await apiClient.post('/api/prospects/enrich/linkedin', {
      linkedinUrl,
      aiProvider,
    });
    return await handleApiResponse(response);
  }

  /**
   * Start company enrichment for a prospect
   */
  static async enrichWithCompany(
    prospectId: number,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ) {
    const response = await apiClient.post('/api/prospects/enrich/company', {
      prospectId,
      aiProvider,
    });
    return await handleApiResponse(response);
  }

  /**
   * Start tech stack enrichment for a prospect
   */
  static async enrichWithTechStack(
    prospectId: number,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ) {
    const response = await apiClient.post('/api/prospects/enrich/techstack', {
      prospectId,
      aiProvider,
    });
    return await handleApiResponse(response);
  }

  /**
   * Start prospect analysis (combines all enrichment data)
   */
  static async enrichWithProspectAnalysis(
    prospectId: number,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ) {
    const response = await apiClient.post('/api/prospects/enrich/analysis', {
      prospectId,
      aiProvider,
    });
    return await handleApiResponse(response);
  }

  /**
   * Start enrichment for a specific prospect
   */
  static async startProspectEnrichment(prospectId: number) {
    const response = await apiClient.post(
      `/api/prospects/${prospectId}/enrichment/start`
    );
    return await handleApiResponse(response);
  }

  /**
   * Get enrichment status for a prospect
   */
  static async getEnrichmentStatus(prospectId: number) {
    const response = await apiClient.get(
      `/api/prospects/${prospectId}/enrichment/status`
    );
    return await handleApiResponse(response);
  }

  /**
   * Get enrichment statistics
   */
  static async getEnrichmentStats(campaignId?: number) {
    const params = campaignId ? `?campaignId=${campaignId}` : '';
    const response = await apiClient.get(
      `/api/prospects/enrichment/stats${params}`
    );
    return await handleApiResponse(response);
  }

  /**
   * Create a new enrichment job
   */
  static async createEnrichmentJob(config: EnrichmentJobConfig): Promise<any> {
    try {
      console.log('📝 Creating enrichment job with config:', {
        ...config,
        csvData: config.csvData ? `${config.csvData.length} rows` : 'none'
      });

      // First create a batch to get batchId
      const batchResponse = await apiClient.post('/api/enrichment/batches', {
        workflowSessionId: config.workflowSessionId,
        configuration: config.configuration,
        campaignId: config.campaignId,
        name: `Enrichment batch for campaign ${config.campaignId || 'unknown'}`,
        source: 'csv_upload',
        metadata: {
          filename: config.filename,
          rowCount: config.csvData?.length || 0
        }
      });

      const batchData = await handleApiResponse(batchResponse);
      const batchId = batchData.data.id;

      console.log('✅ Created batch:', batchId);

      // Create the enrichment job with CSV data (prospects will be created by backend)
      const jobResponse = await apiClient.post('/api/enrichment/jobs', {
        workflowSessionId: config.workflowSessionId,
        campaignId: config.campaignId,
        csvData: config.csvData,
        filename: config.filename,
        batchId,
        configuration: config.configuration
      });

      const jobData = await handleApiResponse(jobResponse);
      return {
        success: true,
        data: {
          ...jobData.data,
          batchId // Include batchId in response
        }
      };
    } catch (error) {
      console.error('Error creating enrichment job:', error);
      throw error;
    }
  }

  /**
   * Get enrichment job status
   */
  static async getEnrichmentJobStatus(jobId: string) {
    const response = await apiClient.get(`/api/enrichment/jobs/${jobId}`);
    return await handleApiResponse(response);
  }

  /**
   * Control enrichment job (pause/resume/cancel/retry)
   */
  static async controlEnrichmentJob(
    jobId: string,
    action: 'pause' | 'resume' | 'cancel' | 'retry'
  ) {
    const response = await apiClient.post(
      `/api/enrichment/jobs/${jobId}/${action}`
    );
    return await handleApiResponse(response);
  }

  /**
   * Bulk start enrichment for multiple prospects (LEGACY - use createEnrichmentJob instead)
   */
  static async bulkStartEnrichment(prospectIds: number[]) {
    const response = await apiClient.post(
      '/api/prospects/bulk/start-enrichment',
      {
        prospectIds,
      }
    );
    return await handleApiResponse(response);
  }

  /**
   * Queue prospect enrichment with background processing
   */
  static async queueProspectEnrichment(data: {
    linkedinUrl: string;
    aiProvider?: 'gemini' | 'openrouter';
    email?: string;
    name?: string;
    company?: string;
    position?: string;
    phone?: string;
    userId?: string;
    campaignId?: number;
  }) {
    const response = await apiClient.post('/api/prospects/enrich/queue', data);
    return await handleApiResponse(response);
  }

  /**
   * Get user enrichment jobs (LEGACY - individual prospect jobs)
   */
  static async getUserEnrichmentJobs(userId: string) {
    const response = await apiClient.get(
      `/api/prospects/enrich/jobs/user/${userId}`
    );
    return await handleApiResponse(response);
  }

  /**
   * Create SSE connection for real-time updates
   */
  static createSSEConnection(
    userId: string,
    onMessage: (event: MessageEvent) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const sseUrl = `/api/jobs/stream/${userId}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = onMessage;
    eventSource.onerror =
      onError ||
      (error => {
        console.error('SSE connection error:', error);
      });

    eventSource.addEventListener('job-progress', onMessage);
    eventSource.addEventListener('batch-progress', onMessage);
    eventSource.addEventListener('prospect-enrichment', onMessage);
    eventSource.addEventListener('workflow-progress', onMessage);
    eventSource.addEventListener('notification', onMessage);

    return eventSource;
  }

  /**
   * Create SSE connection for enrichment job progress (PROPER JOB-BASED SSE)
   */
  static createEnrichmentJobSSE(
    jobId: string,
    onMessage: (event: MessageEvent) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const sseUrl = `/api/enrichment/jobs/${jobId}/progress`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = onMessage;
    eventSource.onerror =
      onError ||
      (error => {
        console.error('Enrichment job SSE connection error:', error);
      });

    // Listen for specific job events
    eventSource.addEventListener('job_status', onMessage);
    eventSource.addEventListener('prospect_update', onMessage);
    eventSource.addEventListener('job_complete', onMessage);
    eventSource.addEventListener('error', onMessage);

    return eventSource;
  }

  /**
   * Helper: Map backend prospect status to frontend status
   */
  private static mapProspectStatus(
    backendStatus: string
  ): ProspectEnrichmentStatus['status'] {
    switch (backendStatus?.toUpperCase()) {
      case 'PENDING':
        return 'pending';
      case 'ENRICHING':
        return 'processing';
      case 'ENRICHED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Helper: Calculate enrichment progress based on prospect data
   */
  private static calculateProgress(prospect: any): number {
    if (!prospect.enrichment) return 0;

    let completedSteps = 0;
    const totalSteps = 4; // LinkedIn, Company, TechStack, Analysis

    if (prospect.enrichment.linkedinSummary) completedSteps++;
    if (prospect.enrichment.companySummary) completedSteps++;
    if (
      prospect.enrichment.techStack &&
      Array.isArray(prospect.enrichment.techStack) &&
      prospect.enrichment.techStack.length > 0
    )
      completedSteps++;
    if (prospect.enrichment.prospectAnalysisSummary) completedSteps++;

    return Math.round((completedSteps / totalSteps) * 100);
  }
}

export default ProspectEnrichmentService;
