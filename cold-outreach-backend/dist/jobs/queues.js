"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = exports.allQueues = exports.dataExportQueue = exports.csvImportQueue = exports.batchEmailGenerationQueue = exports.batchEnrichmentQueue = exports.emailGenerationQueue = exports.prospectEnrichmentQueue = exports.JobPriority = exports.JobType = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("@/config/redis");
/**
 * Queue configuration options
 */
const queueOptions = {
    connection: redis_1.redisConnection,
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
var JobType;
(function (JobType) {
    JobType["PROSPECT_ENRICHMENT"] = "prospect-enrichment";
    JobType["EMAIL_GENERATION"] = "email-generation";
    JobType["BATCH_ENRICHMENT"] = "batch-enrichment";
    JobType["BATCH_EMAIL_GENERATION"] = "batch-email-generation";
    JobType["CSV_IMPORT"] = "csv-import";
    JobType["DATA_EXPORT"] = "data-export";
})(JobType || (exports.JobType = JobType = {}));
/**
 * Job priority levels
 */
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["LOW"] = 1] = "LOW";
    JobPriority[JobPriority["NORMAL"] = 5] = "NORMAL";
    JobPriority[JobPriority["HIGH"] = 10] = "HIGH";
    JobPriority[JobPriority["CRITICAL"] = 20] = "CRITICAL";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
/**
 * Create job queues
 */
exports.prospectEnrichmentQueue = new bullmq_1.Queue(JobType.PROSPECT_ENRICHMENT, queueOptions);
exports.emailGenerationQueue = new bullmq_1.Queue(JobType.EMAIL_GENERATION, queueOptions);
exports.batchEnrichmentQueue = new bullmq_1.Queue(JobType.BATCH_ENRICHMENT, queueOptions);
exports.batchEmailGenerationQueue = new bullmq_1.Queue(JobType.BATCH_EMAIL_GENERATION, queueOptions);
exports.csvImportQueue = new bullmq_1.Queue(JobType.CSV_IMPORT, queueOptions);
exports.dataExportQueue = new bullmq_1.Queue(JobType.DATA_EXPORT, queueOptions);
/**
 * All queues array for management operations
 */
exports.allQueues = [
    exports.prospectEnrichmentQueue,
    exports.emailGenerationQueue,
    exports.batchEnrichmentQueue,
    exports.batchEmailGenerationQueue,
    exports.csvImportQueue,
    exports.dataExportQueue,
];
/**
 * Queue management utilities
 */
class QueueManager {
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
        await Promise.all(exports.allQueues.map(queue => queue.pause()));
        console.log('⏸️ [Queue]: All queues paused');
    }
    /**
     * Resume all queues
     */
    static async resumeAllQueues() {
        await Promise.all(exports.allQueues.map(queue => queue.resume()));
        console.log('▶️ [Queue]: All queues resumed');
    }
    /**
     * Clean completed jobs from all queues
     */
    static async cleanCompletedJobs() {
        const results = await Promise.all(exports.allQueues.map(async (queue) => {
            const cleaned = await queue.clean(24 * 60 * 60 * 1000, 100, 'completed');
            return { queue: queue.name, cleaned };
        }));
        console.log('🧹 [Queue]: Cleaned completed jobs:', results);
        return results;
    }
    /**
     * Clean failed jobs from all queues
     */
    static async cleanFailedJobs() {
        const results = await Promise.all(exports.allQueues.map(async (queue) => {
            const cleaned = await queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');
            return { queue: queue.name, cleaned };
        }));
        console.log('🧹 [Queue]: Cleaned failed jobs:', results);
        return results;
    }
    /**
     * Get job by ID from any queue
     */
    static async getJob(jobId, queueName) {
        if (queueName) {
            const queue = exports.allQueues.find(q => q.name === queueName);
            if (queue) {
                return await queue.getJob(jobId);
            }
        }
        // Search all queues
        for (const queue of exports.allQueues) {
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
    static async cancelJob(jobId, queueName) {
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
    static async getJobsByUser(userId, states = ['waiting', 'active', 'completed', 'failed']) {
        const allJobs = [];
        for (const queue of exports.allQueues) {
            for (const state of states) {
                const jobs = await queue.getJobs([state]);
                const userJobs = jobs.filter((job) => job.data && job.data.userId === userId);
                allJobs.push(...userJobs);
            }
        }
        return allJobs.sort((a, b) => b.timestamp - a.timestamp);
    }
    /**
     * Close all queue connections
     */
    static async closeAllQueues() {
        await Promise.all(exports.allQueues.map(queue => queue.close()));
        console.log('👋 [Queue]: All queues closed');
    }
}
exports.QueueManager = QueueManager;
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
exports.default = {
    prospectEnrichmentQueue: exports.prospectEnrichmentQueue,
    emailGenerationQueue: exports.emailGenerationQueue,
    batchEnrichmentQueue: exports.batchEnrichmentQueue,
    batchEmailGenerationQueue: exports.batchEmailGenerationQueue,
    csvImportQueue: exports.csvImportQueue,
    dataExportQueue: exports.dataExportQueue,
    QueueManager,
};
