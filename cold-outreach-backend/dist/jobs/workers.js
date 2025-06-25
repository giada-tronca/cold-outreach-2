"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerManager = exports.allWorkers = exports.dataExportWorker = exports.csvImportWorker = exports.batchEmailGenerationWorker = exports.batchEnrichmentWorker = exports.emailGenerationWorker = exports.prospectEnrichmentWorker = void 0;
exports.gracefulShutdown = gracefulShutdown;
const bullmq_1 = require("bullmq");
const redis_1 = require("@/config/redis");
// Import processors
const prospectEnrichmentProcessor_1 = require("./processors/prospectEnrichmentProcessor");
const emailGenerationProcessor_1 = require("./processors/emailGenerationProcessor");
const batchEnrichmentProcessor_1 = require("./processors/batchEnrichmentProcessor");
const csvImportProcessor_1 = require("./processors/csvImportProcessor");
// Import job types
const queues_1 = require("./queues");
/**
 * Worker configuration
 */
const workerOptions = {
    connection: redis_1.redisConnection,
    concurrency: 3, // Process up to 3 jobs concurrently per worker
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
};
/**
 * Prospect Enrichment Worker
 */
exports.prospectEnrichmentWorker = new bullmq_1.Worker(queues_1.JobType.PROSPECT_ENRICHMENT, async (job) => {
    console.log(`🔄 [Worker]: Processing prospect enrichment job ${job.id}`);
    return await prospectEnrichmentProcessor_1.ProspectEnrichmentProcessor.process(job);
}, {
    ...workerOptions,
    concurrency: 5, // Higher concurrency for enrichment
});
/**
 * Email Generation Worker
 */
exports.emailGenerationWorker = new bullmq_1.Worker(queues_1.JobType.EMAIL_GENERATION, async (job) => {
    console.log(`🔄 [Worker]: Processing email generation job ${job.id}`);
    return await emailGenerationProcessor_1.EmailGenerationProcessor.process(job);
}, {
    ...workerOptions,
    concurrency: 2, // Lower concurrency for AI tasks
});
/**
 * Batch Enrichment Worker
 */
exports.batchEnrichmentWorker = new bullmq_1.Worker(queues_1.JobType.BATCH_ENRICHMENT, async (job) => {
    console.log(`🔄 [Worker]: Processing batch enrichment job ${job.id}`);
    return await batchEnrichmentProcessor_1.BatchEnrichmentProcessor.process(job);
}, {
    ...workerOptions,
    concurrency: 1, // Single concurrency for batch operations
});
/**
 * Batch Email Generation Worker
 */
exports.batchEmailGenerationWorker = new bullmq_1.Worker(queues_1.JobType.BATCH_EMAIL_GENERATION, async (job) => {
    console.log(`🔄 [Worker]: Processing batch email generation job ${job.id}`);
    // Similar to batch enrichment but for email generation
    return await batchEnrichmentProcessor_1.BatchEnrichmentProcessor.process(job); // Placeholder
}, {
    ...workerOptions,
    concurrency: 1,
});
/**
 * CSV Import Worker
 */
exports.csvImportWorker = new bullmq_1.Worker(queues_1.JobType.CSV_IMPORT, async (job) => {
    console.log(`🔄 [Worker]: Processing CSV import job ${job.id}`);
    return await csvImportProcessor_1.CSVImportProcessor.process(job);
}, {
    ...workerOptions,
    concurrency: 2,
});
/**
 * Data Export Worker
 */
exports.dataExportWorker = new bullmq_1.Worker(queues_1.JobType.DATA_EXPORT, async (job) => {
    console.log(`🔄 [Worker]: Processing data export job ${job.id}`);
    // TODO: Implement data export processor
    return { success: true, message: 'Data export completed' };
}, {
    ...workerOptions,
    concurrency: 2,
});
/**
 * All workers array for management
 */
exports.allWorkers = [
    exports.prospectEnrichmentWorker,
    exports.emailGenerationWorker,
    exports.batchEnrichmentWorker,
    exports.batchEmailGenerationWorker,
    exports.csvImportWorker,
    exports.dataExportWorker,
];
/**
 * Worker Management Class
 */
class WorkerManager {
    /**
     * Start all workers
     */
    static async startAllWorkers() {
        console.log('🚀 [Workers]: Starting all workers...');
        // Set up event listeners if not already done
        if (!this.eventListenersSetup) {
            this.setupEventListeners();
            this.eventListenersSetup = true;
        }
        // Workers are started automatically when created
        console.log(`✅ [Workers]: ${exports.allWorkers.length} workers started successfully`);
        // Log worker status
        exports.allWorkers.forEach(worker => {
            console.log(`   - ${worker.name}: concurrency ${worker.opts.concurrency}`);
        });
    }
    /**
     * Stop all workers
     */
    static async stopAllWorkers() {
        console.log('🛑 [Workers]: Stopping all workers...');
        await Promise.all(exports.allWorkers.map(worker => worker.close()));
        console.log('✅ [Workers]: All workers stopped successfully');
    }
    /**
     * Pause all workers
     */
    static async pauseAllWorkers() {
        await Promise.all(exports.allWorkers.map(worker => worker.pause()));
        console.log('⏸️ [Workers]: All workers paused');
    }
    /**
     * Resume all workers
     */
    static async resumeAllWorkers() {
        await Promise.all(exports.allWorkers.map(worker => worker.resume()));
        console.log('▶️ [Workers]: All workers resumed');
    }
    /**
     * Get worker statistics
     */
    static async getWorkerStats() {
        const stats = await Promise.all(exports.allWorkers.map(async (worker) => {
            const isRunning = !worker.closing;
            const isPaused = worker.isPaused();
            return {
                name: worker.name,
                isRunning,
                isPaused,
                concurrency: worker.opts.concurrency || 1,
            };
        }));
        return stats;
    }
    /**
     * Setup event listeners for all workers
     */
    static setupEventListeners() {
        exports.allWorkers.forEach(worker => {
            // Job events
            worker.on('completed', (job, result) => {
                console.log(`✅ [${worker.name}]: Job ${job.id} completed`);
                // Call processor-specific completion handler
                this.handleJobCompleted(worker.name, job, result);
            });
            worker.on('failed', (job, err) => {
                console.error(`❌ [${worker.name}]: Job ${job?.id} failed:`, err.message);
                // Call processor-specific failure handler
                this.handleJobFailed(worker.name, job, err);
            });
            worker.on('progress', (job, progress) => {
                if (typeof progress === 'object' && progress && 'status' in progress) {
                    console.log(`📊 [${worker.name}]: Job ${job.id} - ${progress.status}`);
                }
                else if (typeof progress === 'object') {
                    // Handle complex progress objects
                    const progressData = progress;
                    if (progressData.progress !== undefined) {
                        console.log(`📊 [${worker.name}]: Job ${job.id} progress: ${progressData.progress}% - ${progressData.message || ''}`);
                    }
                    else {
                        console.log(`📊 [${worker.name}]: Job ${job.id} progress:`, JSON.stringify(progress));
                    }
                }
                else {
                    console.log(`📊 [${worker.name}]: Job ${job.id} progress: ${progress}%`);
                }
            });
            worker.on('stalled', (jobId) => {
                console.warn(`⚠️ [${worker.name}]: Job ${jobId} stalled`);
            });
            // Worker events
            worker.on('error', (err) => {
                console.error(`❌ [${worker.name}]: Worker error:`, err);
            });
            worker.on('closing', () => {
                console.log(`🔌 [${worker.name}]: Worker is closing`);
            });
            worker.on('closed', () => {
                console.log(`🔒 [${worker.name}]: Worker closed`);
            });
            worker.on('paused', () => {
                console.log(`⏸️ [${worker.name}]: Worker paused`);
            });
            worker.on('resumed', () => {
                console.log(`▶️ [${worker.name}]: Worker resumed`);
            });
        });
    }
    /**
     * Handle job completion
     */
    static async handleJobCompleted(workerName, job, result) {
        try {
            switch (workerName) {
                case queues_1.JobType.PROSPECT_ENRICHMENT:
                    await prospectEnrichmentProcessor_1.ProspectEnrichmentProcessor.onCompleted(job, result);
                    break;
                case queues_1.JobType.EMAIL_GENERATION:
                    await emailGenerationProcessor_1.EmailGenerationProcessor.onCompleted(job, result);
                    break;
                case queues_1.JobType.BATCH_ENRICHMENT:
                    await batchEnrichmentProcessor_1.BatchEnrichmentProcessor.onCompleted(job, result);
                    break;
                case queues_1.JobType.CSV_IMPORT:
                    // CSV Import processor doesn't have completion handlers
                    console.log(`✅ [CSV Import]: Job ${job.id} completed successfully`);
                    break;
                // Add other processors as needed
            }
        }
        catch (error) {
            console.error(`Error in completion handler for ${workerName}:`, error);
        }
    }
    /**
     * Handle job failure
     */
    static async handleJobFailed(workerName, job, error) {
        try {
            switch (workerName) {
                case queues_1.JobType.PROSPECT_ENRICHMENT:
                    await prospectEnrichmentProcessor_1.ProspectEnrichmentProcessor.onFailed(job, error);
                    break;
                case queues_1.JobType.EMAIL_GENERATION:
                    await emailGenerationProcessor_1.EmailGenerationProcessor.onFailed(job, error);
                    break;
                case queues_1.JobType.BATCH_ENRICHMENT:
                    await batchEnrichmentProcessor_1.BatchEnrichmentProcessor.onFailed(job, error);
                    break;
                case queues_1.JobType.CSV_IMPORT:
                    // CSV Import processor doesn't have failure handlers
                    console.error(`❌ [CSV Import]: Job ${job?.id} failed:`, error.message);
                    break;
                // Add other processors as needed
            }
        }
        catch (handlerError) {
            console.error(`Error in failure handler for ${workerName}:`, handlerError);
        }
    }
    /**
     * Health check for workers
     */
    static async healthCheck() {
        const stats = await this.getWorkerStats();
        const unhealthyWorkers = stats.filter(stat => !stat.isRunning);
        return {
            healthy: unhealthyWorkers.length === 0,
            totalWorkers: stats.length,
            runningWorkers: stats.filter(stat => stat.isRunning).length,
            pausedWorkers: stats.filter(stat => stat.isPaused).length,
            stats,
            issues: unhealthyWorkers.map(worker => `${worker.name} is not running`),
        };
    }
}
exports.WorkerManager = WorkerManager;
WorkerManager.eventListenersSetup = false;
/**
 * Graceful shutdown handler
 */
async function gracefulShutdown() {
    console.log('🛑 [Workers]: Initiating graceful shutdown...');
    try {
        // Stop accepting new jobs
        await WorkerManager.pauseAllWorkers();
        // Wait for current jobs to complete (with timeout)
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Force close all workers
        await WorkerManager.stopAllWorkers();
        console.log('✅ [Workers]: Graceful shutdown completed');
    }
    catch (error) {
        console.error('❌ [Workers]: Error during graceful shutdown:', error);
    }
}
// Export individual workers and manager
exports.default = {
    prospectEnrichmentWorker: exports.prospectEnrichmentWorker,
    emailGenerationWorker: exports.emailGenerationWorker,
    batchEnrichmentWorker: exports.batchEnrichmentWorker,
    batchEmailGenerationWorker: exports.batchEmailGenerationWorker,
    csvImportWorker: exports.csvImportWorker,
    dataExportWorker: exports.dataExportWorker,
    WorkerManager,
    gracefulShutdown,
};
