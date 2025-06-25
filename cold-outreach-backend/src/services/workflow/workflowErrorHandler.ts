import {
    WorkflowErrorContext,
    WorkflowErrorDefinition,
    WorkflowRecoveryAction,
    WorkflowOperationResult
    // WorkflowStep
} from '@/types/workflow';

export class WorkflowErrorHandler {
    private static errorDefinitions: Record<string, WorkflowErrorDefinition> = {
        'UPLOAD_FILE_TOO_LARGE': {
            code: 'UPLOAD_FILE_TOO_LARGE',
            name: 'File Too Large',
            description: 'Uploaded file exceeds size limit',
            category: 'validation',
            severity: 'medium',
            recoverable: true,
            recoveryActions: [
                {
                    type: 'manual',
                    description: 'Upload a smaller file',
                    automated: false,
                    conditions: ['file_size_under_limit']
                }
            ],
            userMessage: 'The uploaded file is too large. Please upload a file smaller than 100MB.',
            technicalMessage: 'File size exceeds the configured maximum upload limit'
        },
        'INVALID_CSV_FORMAT': {
            code: 'INVALID_CSV_FORMAT',
            name: 'Invalid CSV Format',
            description: 'CSV file format is invalid or corrupted',
            category: 'validation',
            severity: 'high',
            recoverable: true,
            recoveryActions: [
                {
                    type: 'manual',
                    description: 'Fix CSV format and re-upload',
                    automated: false,
                    conditions: ['valid_csv_format']
                }
            ],
            userMessage: 'The CSV file format is invalid. Please check the file and upload again.',
            technicalMessage: 'CSV parsing failed due to format issues'
        },
        'MISSING_REQUIRED_HEADERS': {
            code: 'MISSING_REQUIRED_HEADERS',
            name: 'Missing Required Headers',
            description: 'CSV file is missing required column headers',
            category: 'validation',
            severity: 'high',
            recoverable: true,
            recoveryActions: [
                {
                    type: 'manual',
                    description: 'Add required headers to CSV file',
                    automated: false,
                    conditions: ['has_required_headers']
                }
            ],
            userMessage: 'The CSV file is missing required headers. Please ensure your file has email, name, and company columns.',
            technicalMessage: 'Required CSV headers not found in uploaded file'
        },
        'ENRICHMENT_SERVICE_UNAVAILABLE': {
            code: 'ENRICHMENT_SERVICE_UNAVAILABLE',
            name: 'Enrichment Service Unavailable',
            description: 'External enrichment service is not responding',
            category: 'external',
            severity: 'high',
            recoverable: true,
            recoveryActions: [
                {
                    type: 'retry',
                    description: 'Retry enrichment after delay',
                    automated: true,
                    conditions: ['service_available']
                },
                {
                    type: 'skip',
                    description: 'Skip enrichment and continue',
                    automated: false,
                    conditions: []
                }
            ],
            userMessage: 'The enrichment service is temporarily unavailable. We will retry automatically.',
            technicalMessage: 'HTTP timeout or connection error to enrichment service'
        },
        'API_RATE_LIMIT_EXCEEDED': {
            code: 'API_RATE_LIMIT_EXCEEDED',
            name: 'API Rate Limit Exceeded',
            description: 'API rate limit has been exceeded',
            category: 'external',
            severity: 'medium',
            recoverable: true,
            recoveryActions: [
                {
                    type: 'retry',
                    description: 'Wait and retry after rate limit reset',
                    automated: true,
                    conditions: ['rate_limit_reset']
                }
            ],
            userMessage: 'API rate limit reached. Processing will continue automatically after a short delay.',
            technicalMessage: 'API rate limit exceeded, need to wait for reset'
        },
        'INSUFFICIENT_API_CREDITS': {
            code: 'INSUFFICIENT_API_CREDITS',
            name: 'Insufficient API Credits',
            description: 'Not enough API credits to complete operation',
            category: 'user',
            severity: 'critical',
            recoverable: false,
            recoveryActions: [
                {
                    type: 'manual',
                    description: 'Add more API credits',
                    automated: false,
                    conditions: ['sufficient_credits']
                },
                {
                    type: 'abort',
                    description: 'Cancel operation',
                    automated: false,
                    conditions: []
                }
            ],
            userMessage: 'Insufficient API credits to complete this operation. Please add more credits to continue.',
            technicalMessage: 'API credits balance insufficient for operation'
        },
        'SYSTEM_ERROR': {
            code: 'SYSTEM_ERROR',
            name: 'System Error',
            description: 'An unexpected system error occurred',
            category: 'system',
            severity: 'critical',
            recoverable: true,
            recoveryActions: [
                {
                    type: 'retry',
                    description: 'Retry operation',
                    automated: true,
                    conditions: []
                },
                {
                    type: 'restart',
                    description: 'Restart workflow from last checkpoint',
                    automated: false,
                    conditions: ['checkpoint_available']
                }
            ],
            userMessage: 'A system error occurred. We are retrying the operation automatically.',
            technicalMessage: 'Unhandled system exception occurred'
        }
    };

    private static errorLog = new Map<string, WorkflowErrorContext[]>();

    /**
     * Handle workflow error
     */
    static async handleError(
        error: WorkflowErrorContext
    ): Promise<WorkflowOperationResult<{
        errorDefinition: WorkflowErrorDefinition;
        suggestedAction: WorkflowRecoveryAction;
        canRecover: boolean;
    }>> {
        try {
            // Log the error
            this.logError(error);

            // Identify error type
            const errorCode = this.identifyErrorCode(error);
            const errorDefinition = this.errorDefinitions[errorCode] || this.errorDefinitions['SYSTEM_ERROR'] || {
                code: 'UNKNOWN_ERROR',
                name: 'Unknown Error',
                description: 'An unknown error occurred',
                category: 'system',
                severity: 'critical',
                recoverable: false,
                recoveryActions: [],
                userMessage: 'An unexpected error occurred.',
                technicalMessage: 'Unknown error type'
            };

            // Determine recovery action
            const suggestedAction = this.determineBestRecoveryAction(errorDefinition, error);

            return {
                success: true,
                data: {
                    errorDefinition,
                    suggestedAction,
                    canRecover: errorDefinition.recoverable
                }
            };

        } catch (handlingError) {
            return {
                success: false,
                error: handlingError instanceof Error ? handlingError.message : 'Failed to handle workflow error'
            };
        }
    }

    /**
     * Attempt automatic recovery
     */
    static async attemptRecovery(
        error: WorkflowErrorContext,
        recoveryAction: WorkflowRecoveryAction
    ): Promise<WorkflowOperationResult<boolean>> {
        try {
            if (!recoveryAction.automated) {
                return {
                    success: false,
                    error: 'Recovery action requires manual intervention'
                };
            }

            switch (recoveryAction.type) {
                case 'retry':
                    return await this.executeRetry(error);

                case 'skip':
                    return await this.executeSkip(error);

                default:
                    return {
                        success: false,
                        error: `Unsupported automated recovery type: ${recoveryAction.type}`
                    };
            }

        } catch (recoveryError) {
            return {
                success: false,
                error: recoveryError instanceof Error ? recoveryError.message : 'Recovery attempt failed'
            };
        }
    }

    /**
     * Get error history for session
     */
    static getErrorHistory(sessionId: string): WorkflowErrorContext[] {
        return this.errorLog.get(sessionId) || [];
    }

    /**
     * Clear error history for session
     */
    static clearErrorHistory(sessionId: string): void {
        this.errorLog.delete(sessionId);
    }

    /**
     * Get error statistics
     */
    static getErrorStatistics(sessionId?: string): {
        totalErrors: number;
        errorsByCategory: Record<string, number>;
        errorsBySeverity: Record<string, number>;
        recoverySuccessRate: number;
        commonErrors: Array<{ code: string; count: number }>;
    } {
        const errors = sessionId
            ? this.errorLog.get(sessionId) || []
            : Array.from(this.errorLog.values()).flat();

        const errorsByCategory: Record<string, number> = {};
        const errorsBySeverity: Record<string, number> = {};
        const errorCounts: Record<string, number> = {};

        errors.forEach(error => {
            const errorCode = this.identifyErrorCode(error);
            const errorDef = this.errorDefinitions[errorCode];

            if (errorDef) {
                errorsByCategory[errorDef.category] = (errorsByCategory[errorDef.category] || 0) + 1;
                errorsBySeverity[errorDef.severity] = (errorsBySeverity[errorDef.severity] || 0) + 1;
            }

            errorCounts[errorCode] = (errorCounts[errorCode] || 0) + 1;
        });

        const commonErrors = Object.entries(errorCounts)
            .map(([code, count]) => ({ code, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Mock recovery success rate calculation
        const recoverySuccessRate = 0.85;

        return {
            totalErrors: errors.length,
            errorsByCategory,
            errorsBySeverity,
            recoverySuccessRate,
            commonErrors
        };
    }

    /**
     * Check if error is recoverable
     */
    static isRecoverable(error: WorkflowErrorContext): boolean {
        const errorCode = this.identifyErrorCode(error);
        const errorDefinition = this.errorDefinitions[errorCode];
        return errorDefinition ? errorDefinition.recoverable : false;
    }

    /**
     * Get user-friendly error message
     */
    static getUserMessage(error: WorkflowErrorContext): string {
        const errorCode = this.identifyErrorCode(error);
        const errorDefinition = this.errorDefinitions[errorCode];
        return errorDefinition ? errorDefinition.userMessage : 'An unexpected error occurred.';
    }

    /**
     * Log error to storage
     */
    private static logError(error: WorkflowErrorContext): void {
        const sessionErrors = this.errorLog.get(error.sessionId) || [];
        sessionErrors.push(error);
        this.errorLog.set(error.sessionId, sessionErrors);
    }

    /**
     * Identify error code from error context
     */
    private static identifyErrorCode(error: WorkflowErrorContext): string {
        const errorMessage = error.error.message.toLowerCase();

        if (errorMessage.includes('file too large') || errorMessage.includes('size limit')) {
            return 'UPLOAD_FILE_TOO_LARGE';
        }
        if (errorMessage.includes('csv') && errorMessage.includes('format')) {
            return 'INVALID_CSV_FORMAT';
        }
        if (errorMessage.includes('required') && errorMessage.includes('header')) {
            return 'MISSING_REQUIRED_HEADERS';
        }
        if (errorMessage.includes('rate limit')) {
            return 'API_RATE_LIMIT_EXCEEDED';
        }
        if (errorMessage.includes('credit') || errorMessage.includes('insufficient')) {
            return 'INSUFFICIENT_API_CREDITS';
        }
        if (errorMessage.includes('service unavailable') || errorMessage.includes('timeout')) {
            return 'ENRICHMENT_SERVICE_UNAVAILABLE';
        }

        return 'SYSTEM_ERROR';
    }

    /**
     * Determine best recovery action
     */
    private static determineBestRecoveryAction(
        errorDefinition: WorkflowErrorDefinition,
        error: WorkflowErrorContext
    ): WorkflowRecoveryAction {
        // Return first available recovery action
        return errorDefinition.recoveryActions[0] || {
            type: 'manual',
            description: 'Manual intervention required',
            automated: false,
            conditions: []
        };
    }

    /**
     * Execute retry recovery
     */
    private static async executeRetry(error: WorkflowErrorContext): Promise<WorkflowOperationResult<boolean>> {
        // Mock retry logic - in real implementation, this would retry the failed operation
        const retryDelay = this.calculateRetryDelay(error);

        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Mock success rate for retries
        const successRate = 0.7;
        const success = Math.random() < successRate;

        return {
            success,
            data: success
        };
    }

    /**
     * Execute skip recovery
     */
    private static async executeSkip(error: WorkflowErrorContext): Promise<WorkflowOperationResult<boolean>> {
        // Skip recovery is always successful as it just moves to next step
        return {
            success: true,
            data: true
        };
    }

    /**
     * Calculate retry delay based on error context
     */
    private static calculateRetryDelay(error: WorkflowErrorContext): number {
        // Base delay of 1 second, increased for rate limit errors
        let delay = 1000;

        const errorCode = this.identifyErrorCode(error);
        if (errorCode === 'API_RATE_LIMIT_EXCEEDED') {
            delay = 60000; // 1 minute for rate limits
        } else if (errorCode === 'ENRICHMENT_SERVICE_UNAVAILABLE') {
            delay = 30000; // 30 seconds for service issues
        }

        return delay;
    }

    /**
     * Register custom error definition
     */
    static registerErrorDefinition(errorDefinition: WorkflowErrorDefinition): void {
        this.errorDefinitions[errorDefinition.code] = errorDefinition;
    }

    /**
     * Get all error definitions
     */
    static getErrorDefinitions(): Record<string, WorkflowErrorDefinition> {
        return { ...this.errorDefinitions };
    }
} 