"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundJobService = void 0;
const prospectEnricher_1 = require("./enrichment/prospectEnricher");
const database_1 = require("@/config/database");
class BackgroundJobService {
    /**
     * Add a new prospect enrichment job to the queue
     */
    static async addProspectEnrichmentJob(data) {
        const jobId = this.generateJobId();
        const job = {
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
        console.log(`📝 [BackgroundJob]: Added prospect enrichment job ${jobId} for prospect ${data.prospectId}`);
        // Start processing if not already running
        if (!this.isProcessing) {
            this.startProcessing();
        }
        return jobId;
    }
    /**
     * Get job status and progress
     */
    static getJob(jobId) {
        return this.jobs.get(jobId);
    }
    /**
     * Get all jobs for a user
     */
    static getJobsByUser(userId) {
        return Array.from(this.jobs.values())
            .filter(job => job.data.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Start processing jobs in background
     */
    static async startProcessing() {
        if (this.isProcessing)
            return;
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
        console.log('⏹️ [BackgroundJob]: Stopped background job processing (no pending jobs)');
    }
    /**
     * Process a single job
     */
    static async processJob(job) {
        const startTime = new Date();
        try {
            console.log(`🔄 [BackgroundJob]: Processing job ${job.id} for prospect ${job.data.prospectId}`);
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
            const prospect = await database_1.prisma.prospect.findUnique({
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
            const enrichmentResult = await prospectEnricher_1.ProspectEnricher.enrichExistingProspect(prospect.id, job.data.linkedinUrl, { aiProvider: job.data.aiProvider });
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
            console.log(`✅ [BackgroundJob]: Completed job ${job.id} for prospect ${job.data.prospectId}`);
        }
        catch (error) {
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
    static generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static hasPendingJobs() {
        return Array.from(this.jobs.values()).some(job => job.status === 'pending');
    }
    static getPendingJobs() {
        return Array.from(this.jobs.values())
            .filter(job => job.status === 'pending')
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    static getCurrentlyProcessingCount() {
        return Array.from(this.jobs.values()).filter(job => job.status === 'processing').length;
    }
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Clean up old completed/failed jobs (keep last 50)
     */
    static cleanupOldJobs() {
        const allJobs = Array.from(this.jobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (allJobs.length > 50) {
            const jobsToRemove = allJobs.slice(50);
            jobsToRemove.forEach(job => {
                if (job.status === 'completed' || job.status === 'failed') {
                    this.jobs.delete(job.id);
                }
            });
            console.log(`🧹 [BackgroundJob]: Cleaned up ${jobsToRemove.length} old jobs`);
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
exports.BackgroundJobService = BackgroundJobService;
BackgroundJobService.jobs = new Map();
BackgroundJobService.isProcessing = false;
BackgroundJobService.maxConcurrentJobs = 3;
