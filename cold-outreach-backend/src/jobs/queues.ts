import { Queue, QueueOptions } from 'bullmq';
import { redisConnection } from '@/config/redis';

/**
 * Queue configuration options
 */
const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
  },
};

/**
 * Job types enumeration
 */
export enum JobType {
  PROSPECT_ENRICHMENT = 'prospect-enrichment',
  EMAIL_GENERATION = 'email-generation',
  BATCH_ENRICHMENT = 'batch-enrichment',
  BATCH_EMAIL_GENERATION = 'batch-email-generation',
  CSV_IMPORT = 'csv-import',
  DATA_EXPORT = 'data-export',
}

/**
 * Job priority levels
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20,
}

/**
 * Job data interfaces
 */
export interface ProspectEnrichmentJobData {
  prospectId: string;
  userId: string;
  linkedinUrl: string;
  aiProvider: 'gemini' | 'openrouter';
  llmModelId?: string;
  workflowSessionId?: string;
  enrichmentOptions: {
    includeCompanyInfo: boolean;
    includePersonalInfo: boolean;
    includeContactDetails: boolean;
    includeSocialProfiles: boolean;
  };
  services?: {
    proxycurl?: boolean;
    firecrawl?: boolean;
    builtwith?: boolean;
  };
  // Configuration for enrichment settings
  configuration?: {
    pagesToScrape?: number;
    websitePages?: number;
    retryAttempts?: number;
    concurrency?: number;
    [key: string]: any;
  };
  // CSV data for prospect creation during processing
  csvData?: {
    name?: string;
    email?: string;
    company?: string;
    position?: string;
    linkedinUrl?: string;
    campaignId: number;
    batchId: number;
    csvRowIndex: number;
    additionalData?: Record<string, any>;
  };
}

export interface EmailGenerationJobData {
  prospectId: number;
  campaignId: number;
  userId: string;
  aiProvider: 'gemini' | 'openrouter';
  llmModelId?: string;
  templateId?: string;
  customPrompt?: string;
}

export interface BatchEnrichmentJobData {
  prospectIds: string[];
  userId: string;
  workflowSessionId?: string;
  batchId: string;
  llmModelId?: string;
  enrichmentOptions: {
    includeCompanyInfo: boolean;
    includePersonalInfo: boolean;
    includeContactDetails: boolean;
    includeSocialProfiles: boolean;
  };
}

export interface BatchEmailGenerationJobData {
  prospectIds: number[];
  campaignId: number;
  userId: string;
  batchId: string;
  aiProvider: 'gemini' | 'openrouter';
  llmModelId?: string;
  templateId?: string;
  customPrompt?: string;
  workflowSessionId?: string;
}

export interface CSVImportJobData {
  filePath: string;
  userId: string;
  mappingConfig: Record<string, string>;
  workflowSessionId?: string;
}

export interface DataExportJobData {
  userId: string;
  exportType: 'prospects' | 'campaigns' | 'emails';
  filters: Record<string, any>;
  format: 'csv' | 'xlsx' | 'json';
}

export interface CSVProcessingJobData {
  filePath?: string;
  csvData?: any[];
  filename: string;
  campaignId?: number;
  createCampaign?: boolean;
  campaignName?: string;
  workflowSessionId?: string;
}

/**
 * Job result interfaces
 */
export interface JobProgress {
  progress: number;
  total: number;
  processed: number;
  failed: number;
  status: string;
  message?: string;
  currentItem?: string;
  startTime?: Date;
  estimatedCompletion?: Date;
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  summary?: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
  };
}

/**
 * Create job queues
 */
export const prospectEnrichmentQueue = new Queue<ProspectEnrichmentJobData>(
  JobType.PROSPECT_ENRICHMENT,
  queueOptions
);

export const emailGenerationQueue = new Queue<EmailGenerationJobData>(
  JobType.EMAIL_GENERATION,
  queueOptions
);

export const batchEnrichmentQueue = new Queue<BatchEnrichmentJobData>(
  JobType.BATCH_ENRICHMENT,
  queueOptions
);

export const batchEmailGenerationQueue = new Queue<BatchEmailGenerationJobData>(
  JobType.BATCH_EMAIL_GENERATION,
  queueOptions
);

export const csvImportQueue = new Queue<CSVImportJobData>(
  JobType.CSV_IMPORT,
  queueOptions
);

export const dataExportQueue = new Queue<DataExportJobData>(
  JobType.DATA_EXPORT,
  queueOptions
);

/**
 * All queues array for management operations
 */
export const allQueues = [
  prospectEnrichmentQueue,
  emailGenerationQueue,
  batchEnrichmentQueue,
  batchEmailGenerationQueue,
  csvImportQueue,
  dataExportQueue,
];

/**
 * Queue management utilities
 */
export class QueueManager {
  /**
   * Get queue statistics (commented out)
   */
  static async getQueueStats() {
    // const stats = await Promise.all(
    //     allQueues.map(async (queue) => {
    //         const [waiting, active, completed, failed, delayed] = await Promise.all([
    //             queue.getWaiting(),
    //             queue.getActive(),
    //             queue.getCompleted(),
    //             queue.getFailed(),
    //             queue.getDelayed(),
    //         ])

    //         return {
    //             name: queue.name,
    //             waiting: waiting.length,
    //             active: active.length,
    //             completed: completed.length,
    //             failed: failed.length,
    //             delayed: delayed.length,
    //         }
    //     })
    // )

    return [];
  }

  /**
   * Pause all queues
   */
  static async pauseAllQueues() {
    await Promise.all(allQueues.map(queue => queue.pause()));
    console.log('⏸️ [Queue]: All queues paused');
  }

  /**
   * Resume all queues
   */
  static async resumeAllQueues() {
    await Promise.all(allQueues.map(queue => queue.resume()));
    console.log('▶️ [Queue]: All queues resumed');
  }

  /**
   * Clean completed jobs from all queues
   */
  static async cleanCompletedJobs() {
    const results = await Promise.all(
      allQueues.map(async queue => {
        const cleaned = await queue.clean(
          24 * 60 * 60 * 1000,
          100,
          'completed'
        );
        return { queue: queue.name, cleaned };
      })
    );

    console.log('🧹 [Queue]: Cleaned completed jobs:', results);
    return results;
  }

  /**
   * Clean failed jobs from all queues
   */
  static async cleanFailedJobs() {
    const results = await Promise.all(
      allQueues.map(async queue => {
        const cleaned = await queue.clean(
          7 * 24 * 60 * 60 * 1000,
          50,
          'failed'
        );
        return { queue: queue.name, cleaned };
      })
    );

    console.log('🧹 [Queue]: Cleaned failed jobs:', results);
    return results;
  }

  /**
   * Get job by ID from any queue
   */
  static async getJob(jobId: string, queueName?: string) {
    if (queueName) {
      const queue = allQueues.find(q => q.name === queueName);
      if (queue) {
        return await queue.getJob(jobId);
      }
    }

    // Search all queues
    for (const queue of allQueues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return job;
      }
    }

    return null;
  }

  /**
   * Cancel job by ID
   */
  static async cancelJob(jobId: string, queueName?: string) {
    const job = await this.getJob(jobId, queueName);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  /**
   * Get jobs by user ID
   */
  static async getJobsByUser(
    userId: string,
    states: string[] = ['waiting', 'active', 'completed', 'failed']
  ) {
    const allJobs = [];

    for (const queue of allQueues) {
      for (const state of states) {
        const jobs = await queue.getJobs([state as any]);
        const userJobs = jobs.filter(
          (job: any) => job.data && (job.data as any).userId === userId
        );
        allJobs.push(...userJobs);
      }
    }

    return allJobs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Close all queue connections
   */
  static async closeAllQueues() {
    await Promise.all(allQueues.map(queue => queue.close()));
    console.log('👋 [Queue]: All queues closed');
  }
}

/**
 * Queue event listeners for monitoring (commented out to avoid type issues)
 */
// const setupQueueEventListeners = () => {
//     allQueues.forEach(queue => {
//         queue.on('waiting', (job) => {
//             console.log(`⏳ [${queue.name}]: Job ${job.id} is waiting`)
//         })

//         queue.on('active', (job) => {
//             console.log(`🔄 [${queue.name}]: Job ${job.id} started processing`)
//         })

//         queue.on('completed', (job, result) => {
//             console.log(`✅ [${queue.name}]: Job ${job.id} completed`)
//         })

//         queue.on('failed', (job, err) => {
//             console.error(`❌ [${queue.name}]: Job ${job?.id} failed:`, err.message)
//         })

//         queue.on('stalled', (jobId) => {
//             console.warn(`⚠️ [${queue.name}]: Job ${jobId} stalled`)
//         })

//         queue.on('progress', (job, progress) => {
//             console.log(`📊 [${queue.name}]: Job ${job.id} progress: ${progress}%`)
//         })
//     })
// }

// Initialize event listeners if not in test environment
// if (envConfig.NODE_ENV !== 'test') {
//     setupQueueEventListeners()
// }

export default {
  prospectEnrichmentQueue,
  emailGenerationQueue,
  batchEnrichmentQueue,
  batchEmailGenerationQueue,
  csvImportQueue,
  dataExportQueue,
  QueueManager,
};
