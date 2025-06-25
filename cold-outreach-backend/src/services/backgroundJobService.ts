import { ProspectEnricher } from './enrichment/prospectEnricher';
import { prisma } from '@/config/database';
import {
  ProspectEnrichmentJobData,
  JobResult,
  JobProgress,
} from '@/jobs/queues';

interface BackgroundJob {
  id: string;
  type: 'prospect-enrichment';
  data: ProspectEnrichmentJobData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: JobProgress;
  result?: JobResult;
  error?: string;
}

export class BackgroundJobService {
  private static jobs = new Map<string, BackgroundJob>();
  private static isProcessing = false;
  private static maxConcurrentJobs = 3;

  /**
   * Add a new prospect enrichment job to the queue
   */
  static async addProspectEnrichmentJob(
    data: ProspectEnrichmentJobData
  ): Promise<string> {
    const jobId = this.generateJobId();

    const job: BackgroundJob = {
      id: jobId,
      type: 'prospect-enrichment',
      data,
      status: 'pending',
      createdAt: new Date(),
      progress: {
        progress: 0,
        total: 1,
        processed: 0,
        failed: 0,
        status: 'Queued for processing',
      },
    };

    this.jobs.set(jobId, job);
    console.log(
      `📝 [BackgroundJob]: Added prospect enrichment job ${jobId} for prospect ${data.prospectId}`
    );

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return jobId;
  }

  /**
   * Get job status and progress
   */
  static getJob(jobId: string): BackgroundJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a user
   */
  static getJobsByUser(userId: string): BackgroundJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.data.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Start processing jobs in background
   */
  private static async startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('🚀 [BackgroundJob]: Started background job processing');

    while (this.hasPendingJobs()) {
      const currentlyProcessing = this.getCurrentlyProcessingCount();
      const availableSlots = this.maxConcurrentJobs - currentlyProcessing;

      if (availableSlots > 0) {
        const pendingJobs = this.getPendingJobs().slice(0, availableSlots);

        // Process jobs in parallel
        const promises = pendingJobs.map(job => this.processJob(job));
        await Promise.allSettled(promises);
      }

      // Wait a bit before checking for more jobs
      await this.sleep(1000);
    }

    this.isProcessing = false;
    console.log(
      '⏹️ [BackgroundJob]: Stopped background job processing (no pending jobs)'
    );
  }

  /**
   * Process a single job
   */
  private static async processJob(job: BackgroundJob): Promise<void> {
    const startTime = new Date();

    try {
      console.log(
        `🔄 [BackgroundJob]: Processing job ${job.id} for prospect ${job.data.prospectId}`
      );

      // Update job status
      job.status = 'processing';
      job.startedAt = startTime;
      job.progress = {
        progress: 10,
        total: 1,
        processed: 0,
        failed: 0,
        status: 'Starting LinkedIn enrichment...',
        startTime: startTime,
      };

      // Get the prospect from database
      // Using imported prisma client
      const prospect = await prisma.prospect.findUnique({
        where: { id: parseInt(job.data.prospectId) },
      });

      if (!prospect) {
        throw new Error(`Prospect with ID ${job.data.prospectId} not found`);
      }

      // Update progress
      job.progress = {
        progress: 30,
        total: 1,
        processed: 0,
        failed: 0,
        status: 'Fetching LinkedIn profile data...',
        startTime: startTime,
      };

      // Perform the enrichment (without creating prospect)
      const enrichmentResult = await ProspectEnricher.enrichExistingProspect(
        prospect.id,
        job.data.linkedinUrl,
        { aiProvider: job.data.aiProvider }
      );

      // Update progress
      job.progress = {
        progress: 90,
        total: 1,
        processed: 0,
        failed: 0,
        status: 'Saving enrichment data...',
        startTime: startTime,
      };

      // Complete the job
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = {
        progress: 100,
        total: 1,
        processed: 1,
        failed: 0,
        status: 'Enrichment completed successfully',
        startTime: startTime,
      };
      job.result = {
        success: true,
        message: enrichmentResult.message,
        data: enrichmentResult,
        summary: {
          total: 1,
          processed: 1,
          failed: 0,
          skipped: enrichmentResult.skipped ? 1 : 0,
        },
      };

      console.log(
        `✅ [BackgroundJob]: Completed job ${job.id} for prospect ${job.data.prospectId}`
      );
    } catch (error) {
      console.error(`❌ [BackgroundJob]: Failed job ${job.id}:`, error);

      job.status = 'failed';
      job.completedAt = new Date();
      job.progress = {
        progress: 100,
        total: 1,
        processed: 0,
        failed: 1,
        status: 'Enrichment failed',
        startTime: startTime,
      };
      job.error = error instanceof Error ? error.message : String(error);
      job.result = {
        success: false,
        message: `Enrichment failed: ${job.error}`,
        errors: [job.error],
        summary: {
          total: 1,
          processed: 0,
          failed: 1,
          skipped: 0,
        },
      };
    }
  }

  /**
   * Helper methods
   */
  private static generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static hasPendingJobs(): boolean {
    return Array.from(this.jobs.values()).some(job => job.status === 'pending');
  }

  private static getPendingJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private static getCurrentlyProcessingCount(): number {
    return Array.from(this.jobs.values()).filter(
      job => job.status === 'processing'
    ).length;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old completed/failed jobs (keep last 50)
   */
  static cleanupOldJobs(): void {
    const allJobs = Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (allJobs.length > 50) {
      const jobsToRemove = allJobs.slice(50);
      jobsToRemove.forEach(job => {
        if (job.status === 'completed' || job.status === 'failed') {
          this.jobs.delete(job.id);
        }
      });
      console.log(
        `🧹 [BackgroundJob]: Cleaned up ${jobsToRemove.length} old jobs`
      );
    }
  }

  /**
   * Get statistics
   */
  static getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }
}
