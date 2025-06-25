"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessorService = void 0;
const csvParser_1 = require("./csvParser");
const dataMapper_1 = require("./dataMapper");
const errors_1 = require("@/utils/errors");
class BatchProcessorService {
    /**
     * Process CSV file in batches
     */
    static async processCSVFile(options, progressCallback) {
        const startTime = new Date();
        const batchId = this.generateBatchId();
        const config = { ...this.DEFAULT_CONFIG, ...options.batchConfig };
        try {
            // Phase 1: Parse CSV
            const progress = this.createInitialProgress(batchId, startTime);
            progress.status = 'parsing';
            progress.message = 'Parsing CSV file...';
            progressCallback?.(progress);
            const parseResult = await csvParser_1.CSVParserService.parseFromFile(options.filePath, {
                skipEmptyLines: true,
                skipLinesWithError: config.skipErrors,
                maxFileSize: 50 * 1024 * 1024 // 50MB max
            });
            if (parseResult.errors.length > 0 && !config.skipErrors) {
                throw new errors_1.BadRequestError(`CSV parsing failed with ${parseResult.errors.length} errors`);
            }
            // Phase 2: Data mapping
            progress.status = 'mapping';
            progress.message = 'Mapping CSV data to prospect format...';
            progress.totalRows = parseResult.totalRows;
            progressCallback?.(progress);
            const mappingConfig = options.mappingConfig ||
                dataMapper_1.DataMapperService.createMappingConfig(parseResult.headers);
            const mappingResult = dataMapper_1.DataMapperService.mapProspects(parseResult.data, mappingConfig);
            if (mappingResult.prospects.length === 0) {
                throw new errors_1.BadRequestError('No valid prospects found after data mapping');
            }
            // Phase 3: Batch processing
            progress.status = 'processing';
            progress.message = 'Processing prospects in batches...';
            progressCallback?.(progress);
            const batchChunks = this.createBatchChunks(mappingResult.prospects, config.chunkSize);
            const batchResults = await this.processBatchChunks(batchChunks, options.campaignId, config, (chunkProgress) => {
                progress.currentChunk = chunkProgress.currentChunk;
                progress.totalChunks = chunkProgress.totalChunks;
                progress.processedRows = chunkProgress.processedRows;
                progress.successfulRows = chunkProgress.successfulRows;
                progress.failedRows = chunkProgress.failedRows;
                progress.progress = (progress.processedRows / progress.totalRows) * 100;
                progress.message = `Processing batch ${progress.currentChunk}/${progress.totalChunks}...`;
                progress.estimatedCompletion = this.estimateCompletion(startTime, progress.progress);
                progressCallback?.(progress);
            });
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();
            // Calculate final statistics
            const successfulRows = batchResults.reduce((sum, chunk) => sum + chunk.prospects.length, 0);
            const failedRows = batchResults.reduce((sum, chunk) => sum + chunk.errors.length, 0);
            const skippedRows = mappingResult.skippedRows;
            const result = {
                batchId,
                totalRows: parseResult.totalRows,
                processedRows: parseResult.validRows,
                successfulRows,
                failedRows,
                skippedRows,
                batches: batchResults,
                parseResult,
                mappingResult,
                duration,
                status: failedRows === 0 ? 'completed' :
                    successfulRows > 0 ? 'partial' : 'failed'
            };
            // Final progress update
            progress.status = 'completed';
            progress.message = `Processing completed. ${successfulRows} prospects processed successfully.`;
            progress.progress = 100;
            progressCallback?.(progress);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Error progress update
            const errorProgress = this.createInitialProgress(batchId, startTime);
            errorProgress.status = 'failed';
            errorProgress.message = `Processing failed: ${errorMessage}`;
            progressCallback?.(errorProgress);
            throw error;
        }
    }
    /**
     * Create batch chunks from prospects array
     */
    static createBatchChunks(prospects, chunkSize) {
        const chunks = [];
        for (let i = 0; i < prospects.length; i += chunkSize) {
            chunks.push(prospects.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Process all batch chunks with concurrency control
     */
    static async processBatchChunks(chunks, campaignId, config, progressCallback) {
        const results = [];
        let currentChunk = 0;
        let processedRows = 0;
        let successfulRows = 0;
        let failedRows = 0;
        // Process chunks with concurrency limit
        const semaphore = new Set();
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!chunk)
                continue;
            const chunkId = `chunk_${i + 1}`;
            const startRow = i * config.chunkSize + 1;
            const endRow = startRow + chunk.length - 1;
            // Wait if we've reached max concurrency
            if (semaphore.size >= config.maxConcurrency) {
                await Promise.race(semaphore);
            }
            const chunkPromise = this.processChunk(chunkId, chunk, campaignId, startRow, endRow, config).then((result) => {
                results.push(result);
                currentChunk++;
                processedRows += chunk.length;
                successfulRows += result.prospects.length;
                failedRows += result.errors.length;
                progressCallback?.({
                    currentChunk,
                    totalChunks: chunks.length,
                    processedRows,
                    successfulRows,
                    failedRows
                });
                semaphore.delete(chunkPromise);
            }).catch((error) => {
                const errorResult = {
                    chunkId,
                    startRow,
                    endRow,
                    status: 'failed',
                    attempts: config.retryAttempts,
                    error: error.message,
                    prospects: [],
                    errors: [{ error: error.message, chunk: chunkId }]
                };
                results.push(errorResult);
                currentChunk++;
                processedRows += chunk.length;
                failedRows += chunk.length;
                progressCallback?.({
                    currentChunk,
                    totalChunks: chunks.length,
                    processedRows,
                    successfulRows,
                    failedRows
                });
                semaphore.delete(chunkPromise);
            });
            semaphore.add(chunkPromise);
        }
        // Wait for all remaining chunks to complete
        await Promise.all(semaphore);
        return results.sort((a, b) => a.startRow - b.startRow);
    }
    /**
     * Process a single chunk with retry logic
     */
    static async processChunk(chunkId, chunk, campaignId, startRow, endRow, config) {
        let attempts = 0;
        let lastError = null;
        while (attempts < config.retryAttempts) {
            attempts++;
            try {
                const startTime = Date.now();
                const result = {
                    chunkId,
                    startRow,
                    endRow,
                    status: 'processing',
                    attempts,
                    prospects: [],
                    errors: []
                };
                // Simulate processing (in real implementation, this would save to database)
                // For now, we'll just validate and prepare the data
                const processedProspects = [];
                const errors = [];
                for (const prospect of chunk) {
                    try {
                        // Validate prospect data
                        if (!prospect.email) {
                            errors.push({
                                error: 'Missing email address',
                                prospect: prospect.name || 'Unknown'
                            });
                            continue;
                        }
                        // In real implementation, save to database here
                        // await this.saveProspectToDatabase(prospect, campaignId);
                        processedProspects.push(prospect);
                    }
                    catch (error) {
                        errors.push({
                            error: error instanceof Error ? error.message : 'Unknown error',
                            prospect: prospect.name || prospect.email || 'Unknown'
                        });
                    }
                }
                const duration = Date.now() - startTime;
                result.status = 'completed';
                result.processedAt = new Date();
                result.duration = duration;
                result.prospects = processedProspects;
                result.errors = errors;
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                if (attempts < config.retryAttempts) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, config.retryDelay * attempts));
                }
            }
        }
        // All retries failed
        return {
            chunkId,
            startRow,
            endRow,
            status: 'failed',
            attempts,
            error: lastError?.message || 'Unknown error',
            prospects: [],
            errors: [{ error: lastError?.message || 'Unknown error', chunk: chunkId }]
        };
    }
    /**
     * Create initial progress object
     */
    static createInitialProgress(batchId, startTime) {
        return {
            batchId,
            currentChunk: 0,
            totalChunks: 0,
            processedRows: 0,
            totalRows: 0,
            successfulRows: 0,
            failedRows: 0,
            progress: 0,
            status: 'parsing',
            message: 'Starting CSV processing...',
            startTime
        };
    }
    /**
     * Generate unique batch ID
     */
    static generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Estimate completion time
     */
    static estimateCompletion(startTime, progress) {
        if (progress <= 0)
            return new Date();
        const elapsed = Date.now() - startTime.getTime();
        const totalEstimated = (elapsed / progress) * 100;
        const remaining = totalEstimated - elapsed;
        return new Date(Date.now() + remaining);
    }
    /**
     * Get batch processing statistics
     */
    static getBatchStats(result) {
        return {
            successRate: result.totalRows > 0 ? (result.successfulRows / result.totalRows) * 100 : 0,
            failureRate: result.totalRows > 0 ? (result.failedRows / result.totalRows) * 100 : 0,
            skipRate: result.totalRows > 0 ? (result.skippedRows / result.totalRows) * 100 : 0,
            averageChunkTime: result.batches.length > 0 ?
                result.batches.filter(b => b.duration).reduce((sum, b) => sum + (b.duration || 0), 0) /
                    result.batches.filter(b => b.duration).length : 0,
            totalChunks: result.batches.length,
            failedChunks: result.batches.filter(b => b.status === 'failed').length,
            retryCount: result.batches.reduce((sum, b) => sum + (b.attempts - 1), 0)
        };
    }
    /**
     * Generate batch processing report
     */
    static generateBatchReport(result) {
        const stats = this.getBatchStats(result);
        let report = `Batch Processing Report\n`;
        report += `=======================\n\n`;
        report += `Batch ID: ${result.batchId}\n`;
        report += `Status: ${result.status.toUpperCase()}\n`;
        report += `Duration: ${(result.duration / 1000).toFixed(2)} seconds\n\n`;
        report += `Processing Summary:\n`;
        report += `------------------\n`;
        report += `Total Rows: ${result.totalRows}\n`;
        report += `Processed: ${result.processedRows}\n`;
        report += `Successful: ${result.successfulRows}\n`;
        report += `Failed: ${result.failedRows}\n`;
        report += `Skipped: ${result.skippedRows}\n`;
        report += `Success Rate: ${stats.successRate.toFixed(2)}%\n\n`;
        report += `Batch Performance:\n`;
        report += `------------------\n`;
        report += `Total Chunks: ${stats.totalChunks}\n`;
        report += `Failed Chunks: ${stats.failedChunks}\n`;
        report += `Average Chunk Time: ${stats.averageChunkTime.toFixed(2)}ms\n`;
        report += `Total Retries: ${stats.retryCount}\n\n`;
        if (result.batches.some(b => b.status === 'failed')) {
            report += `Failed Chunks:\n`;
            report += `--------------\n`;
            result.batches
                .filter(b => b.status === 'failed')
                .forEach(chunk => {
                report += `- ${chunk.chunkId} (rows ${chunk.startRow}-${chunk.endRow}): ${chunk.error}\n`;
            });
        }
        return report;
    }
}
exports.BatchProcessorService = BatchProcessorService;
BatchProcessorService.DEFAULT_CONFIG = {
    chunkSize: 500,
    maxConcurrency: 3,
    retryAttempts: 3,
    retryDelay: 1000,
    skipErrors: true,
    saveProgressInterval: 5
};
