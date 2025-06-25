import { CSVParserService, CSVParseResult, CSVParseOptions } from './csvParser';
import { DataMapperService, MappingResult, MappingConfig } from './dataMapper';
import { BatchProcessorService, BatchResult, BatchProcessingOptions, BatchProgress } from './batchProcessor';
import { AppError, BadRequestError } from '@/utils/errors';
import fs from 'fs';
import path from 'path';

export interface CSVProcessingOptions {
    filePath: string;
    campaignId: number;
    fileName?: string;
    parseOptions?: CSVParseOptions;
    mappingConfig?: Partial<MappingConfig>;
    batchConfig?: {
        chunkSize?: number;
        maxConcurrency?: number;
        retryAttempts?: number;
        skipErrors?: boolean;
    };
    saveToDatabase?: boolean;
    generateReports?: boolean;
}

export interface CSVProcessingResult {
    success: boolean;
    parseResult: CSVParseResult;
    mappingResult: MappingResult;
    batchResult?: BatchResult;
    reports: {
        parseReport: string;
        mappingReport: string;
        batchReport?: string;
        summary: string;
    };
    statistics: {
        totalRows: number;
        successfulRows: number;
        failedRows: number;
        successRate: number;
        processingTime: number;
    };
}

export interface CSVValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fileInfo: {
        size: number;
        path: string;
        exists: boolean;
        readable: boolean;
    };
    preview?: {
        headers: string[];
        sampleRows: string[][];
        estimatedRows: number;
    };
}

export class CSVProcessingService {
    /**
     * Validate CSV file before processing
     */
    static async validateCSVFile(filePath: string): Promise<CSVValidationResult> {
        const result: CSVValidationResult = {
            isValid: false,
            errors: [],
            warnings: [],
            fileInfo: {
                size: 0,
                path: filePath,
                exists: false,
                readable: false
            }
        };

        try {
            // Check file existence and accessibility
            if (!fs.existsSync(filePath)) {
                result.errors.push('File does not exist');
                return result;
            }

            const stats = fs.statSync(filePath);
            result.fileInfo.exists = true;
            result.fileInfo.size = stats.size;

            // Check file permissions
            try {
                fs.accessSync(filePath, fs.constants.R_OK);
                result.fileInfo.readable = true;
            } catch {
                result.errors.push('File is not readable');
                return result;
            }

            // Check file size
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (stats.size > maxSize) {
                result.errors.push(`File size exceeds maximum allowed size (100MB)`);
            }

            if (stats.size === 0) {
                result.errors.push('File is empty');
                return result;
            }

            // Check file extension
            const ext = path.extname(filePath).toLowerCase();
            if (ext !== '.csv') {
                result.warnings.push(`File extension '${ext}' is not .csv`);
            }

            // Try to parse a preview
            try {
                const parseResult = await CSVParserService.parseFromFile(filePath, {
                    skipEmptyLines: true,
                    maxFileSize: maxSize
                });

                if (parseResult.headers.length === 0) {
                    result.errors.push('No headers found in CSV file');
                }

                if (parseResult.totalRows === 0) {
                    result.errors.push('No data rows found in CSV file');
                }

                // Create preview
                result.preview = {
                    headers: parseResult.headers,
                    sampleRows: parseResult.data.slice(0, 5).map(row =>
                        parseResult.headers.map(header => row[header] || '')
                    ),
                    estimatedRows: parseResult.totalRows
                };

                // Check for common required fields
                const lowerHeaders = parseResult.headers.map(h => h.toLowerCase());
                const hasEmail = lowerHeaders.some(h => h.includes('email') || h.includes('mail'));

                if (!hasEmail) {
                    result.warnings.push('No email column detected');
                }

            } catch (error) {
                result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            result.isValid = result.errors.length === 0;
            return result;

        } catch (error) {
            result.errors.push(`File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
    }

    /**
     * Process CSV file with all steps
     */
    static async processCSVFile(
        options: CSVProcessingOptions,
        progressCallback?: (progress: BatchProgress) => void
    ): Promise<CSVProcessingResult> {
        const startTime = Date.now();

        try {
            // Step 1: Validate file
            const validation = await this.validateCSVFile(options.filePath);
            if (!validation.isValid) {
                throw new BadRequestError(`CSV validation failed: ${validation.errors.join(', ')}`);
            }

            // Step 2: Parse CSV
            const parseResult = await CSVParserService.parseFromFile(options.filePath, {
                skipEmptyLines: true,
                skipLinesWithError: true,
                maxFileSize: 100 * 1024 * 1024,
                ...options.parseOptions
            });

            if (parseResult.totalRows === 0) {
                throw new BadRequestError('No data found in CSV file');
            }

            // Step 3: Map data
            const mappingConfig = options.mappingConfig ||
                DataMapperService.createMappingConfig(parseResult.headers);

            const mappingResult = DataMapperService.mapProspects(parseResult.data, mappingConfig);

            if (mappingResult.prospects.length === 0) {
                throw new BadRequestError('No valid prospects found after data mapping');
            }

            // Step 4: Batch processing (if enabled)
            let batchResult: BatchResult | undefined;

            if (options.saveToDatabase !== false) {
                const batchOptions: BatchProcessingOptions = {
                    campaignId: options.campaignId,
                    fileName: options.fileName || path.basename(options.filePath),
                    filePath: options.filePath,
                    mappingConfig
                };

                if (options.batchConfig) {
                    batchOptions.batchConfig = options.batchConfig;
                }

                batchResult = await BatchProcessorService.processCSVFile(batchOptions, progressCallback);
            }

            // Step 5: Generate reports
            const reports = this.generateReports(parseResult, mappingResult, batchResult);
            const statistics = this.calculateStatistics(parseResult, mappingResult, startTime, batchResult);

            return {
                success: true,
                parseResult,
                mappingResult,
                ...(batchResult && { batchResult }),
                reports,
                statistics
            };

        } catch (error) {
            throw error instanceof AppError ? error : new BadRequestError(
                `CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Generate comprehensive reports
     */
    private static generateReports(
        parseResult: CSVParseResult,
        mappingResult: MappingResult,
        batchResult?: BatchResult
    ) {
        const parseReport = CSVParserService.generateErrorReport(parseResult);
        const mappingReport = DataMapperService.generateMappingReport(mappingResult);
        const batchReport = batchResult ? BatchProcessorService.generateBatchReport(batchResult) : undefined;

        // Generate summary report
        let summary = `CSV Processing Summary\n`;
        summary += `======================\n\n`;

        if (batchResult) {
            summary += `Batch ID: ${batchResult.batchId}\n`;
            summary += `Status: ${batchResult.status.toUpperCase()}\n`;
            summary += `Processing Time: ${(batchResult.duration / 1000).toFixed(2)} seconds\n\n`;
        }

        summary += `File Processing:\n`;
        summary += `Total Rows in CSV: ${parseResult.totalRows}\n`;
        summary += `Valid Rows Parsed: ${parseResult.validRows}\n`;
        summary += `Parse Errors: ${parseResult.errors.length}\n\n`;

        summary += `Data Mapping:\n`;
        summary += `Successfully Mapped: ${mappingResult.prospects.length}\n`;
        summary += `Mapping Errors: ${mappingResult.errors.length}\n`;
        summary += `Skipped Rows: ${mappingResult.skippedRows}\n\n`;

        if (batchResult) {
            summary += `Batch Processing:\n`;
            summary += `Successfully Processed: ${batchResult.successfulRows}\n`;
            summary += `Failed Processing: ${batchResult.failedRows}\n`;
            summary += `Total Chunks: ${batchResult.batches.length}\n\n`;
        }

        const successRate = parseResult.totalRows > 0 ?
            ((batchResult?.successfulRows || mappingResult.prospects.length) / parseResult.totalRows) * 100 : 0;

        summary += `Overall Success Rate: ${successRate.toFixed(2)}%\n`;

        const reports: any = {
            parseReport,
            mappingReport,
            summary
        };

        if (batchReport) {
            reports.batchReport = batchReport;
        }

        return reports;
    }

    /**
     * Calculate processing statistics
     */
    private static calculateStatistics(
        parseResult: CSVParseResult,
        mappingResult: MappingResult,
        startTime: number,
        batchResult?: BatchResult
    ) {
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        const totalRows = parseResult.totalRows;
        const successfulRows = batchResult?.successfulRows || mappingResult.prospects.length;
        const failedRows = (batchResult?.failedRows || 0) + mappingResult.errors.length;
        const successRate = totalRows > 0 ? (successfulRows / totalRows) * 100 : 0;

        return {
            totalRows,
            successfulRows,
            failedRows,
            successRate,
            processingTime
        };
    }
} 