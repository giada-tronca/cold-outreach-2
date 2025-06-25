"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowProgressTracker = void 0;
class WorkflowProgressTracker {
    /**
     * Initialize progress tracking for a workflow session
     */
    static initializeProgress(sessionId) {
        try {
            const now = new Date();
            const initialProgress = {
                currentStep: 'UPLOAD_CSV',
                overallProgress: 0,
                steps: {
                    'UPLOAD_CSV': {
                        step: 'UPLOAD_CSV',
                        status: 'pending',
                        progress: 0,
                        startedAt: undefined,
                        completedAt: undefined,
                        errors: []
                    },
                    'CAMPAIGN_SETTINGS': {
                        step: 'CAMPAIGN_SETTINGS',
                        status: 'pending',
                        progress: 0,
                        startedAt: undefined,
                        completedAt: undefined,
                        errors: []
                    },
                    'ENRICHMENT_CONFIG': {
                        step: 'ENRICHMENT_CONFIG',
                        status: 'pending',
                        progress: 0,
                        startedAt: undefined,
                        completedAt: undefined,
                        errors: []
                    },
                    'BEGIN_ENRICHMENT': {
                        step: 'BEGIN_ENRICHMENT',
                        status: 'pending',
                        progress: 0,
                        startedAt: undefined,
                        completedAt: undefined,
                        errors: []
                    },
                    'EMAIL_GENERATION': {
                        step: 'EMAIL_GENERATION',
                        status: 'pending',
                        progress: 0,
                        startedAt: undefined,
                        completedAt: undefined,
                        errors: []
                    },
                    'COMPLETED': {
                        step: 'COMPLETED',
                        status: 'pending',
                        progress: 0,
                        startedAt: undefined,
                        completedAt: undefined,
                        errors: []
                    }
                },
                startedAt: now,
                lastUpdated: now
            };
            this.progressData.set(sessionId, initialProgress);
            this.emitEvent(sessionId, {
                type: 'session_created',
                sessionId,
                data: initialProgress,
                timestamp: now
            });
            return {
                success: true,
                data: initialProgress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to initialize progress'
            };
        }
    }
    /**
     * Get current progress for a session
     */
    static getProgress(sessionId) {
        try {
            const progress = this.progressData.get(sessionId);
            if (!progress) {
                return {
                    success: false,
                    error: 'Progress data not found for session'
                };
            }
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get progress'
            };
        }
    }
    /**
     * Start a workflow step
     */
    static startStep(sessionId, step) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            const now = new Date();
            // Update step status
            progress.steps[step] = {
                ...progress.steps[step],
                status: 'in_progress',
                startedAt: now,
                message: `Starting ${step.toLowerCase().replace('_', ' ')}`
            };
            // Update current step and overall progress
            progress.currentStep = step;
            progress.lastUpdated = now;
            progress.overallProgress = this.calculateOverallProgress(progress);
            this.progressData.set(sessionId, progress);
            this.emitEvent(sessionId, {
                type: 'step_started',
                sessionId,
                step,
                data: progress.steps[step],
                timestamp: now
            });
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start step'
            };
        }
    }
    /**
     * Update step progress
     */
    static updateStepProgress(sessionId, step, progressPercent, message) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            const now = new Date();
            // Clamp progress between 0 and 100
            const clampedProgress = Math.max(0, Math.min(100, progressPercent));
            // Update step progress
            progress.steps[step] = {
                ...progress.steps[step],
                progress: clampedProgress,
                message,
                metadata: {
                    ...progress.steps[step].metadata,
                    lastProgressUpdate: now
                }
            };
            // Update overall progress and timestamps
            progress.lastUpdated = now;
            progress.overallProgress = this.calculateOverallProgress(progress);
            this.progressData.set(sessionId, progress);
            this.emitEvent(sessionId, {
                type: 'progress_updated',
                sessionId,
                step,
                data: {
                    progress: clampedProgress,
                    message,
                    overallProgress: progress.overallProgress
                },
                timestamp: now
            });
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update step progress'
            };
        }
    }
    /**
     * Complete a workflow step
     */
    static completeStep(sessionId, step, message) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            const now = new Date();
            // Update step status
            progress.steps[step] = {
                ...progress.steps[step],
                status: 'completed',
                progress: 100,
                completedAt: now,
                message: message || `${step.toLowerCase().replace('_', ' ')} completed`
            };
            // Update overall progress
            progress.lastUpdated = now;
            progress.overallProgress = this.calculateOverallProgress(progress);
            this.progressData.set(sessionId, progress);
            this.emitEvent(sessionId, {
                type: 'step_completed',
                sessionId,
                step,
                data: progress.steps[step],
                timestamp: now
            });
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to complete step'
            };
        }
    }
    /**
     * Mark a step as failed
     */
    static failStep(sessionId, step, errorMessage) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            const now = new Date();
            // Update step status
            const stepErrors = progress.steps[step].errors || [];
            stepErrors.push(errorMessage);
            progress.steps[step] = {
                ...progress.steps[step],
                status: 'failed',
                errors: stepErrors,
                message: `Failed: ${errorMessage}`,
                metadata: {
                    ...progress.steps[step].metadata,
                    failedAt: now
                }
            };
            progress.lastUpdated = now;
            this.progressData.set(sessionId, progress);
            this.emitEvent(sessionId, {
                type: 'step_failed',
                sessionId,
                step,
                data: {
                    error: errorMessage,
                    stepProgress: progress.steps[step]
                },
                timestamp: now
            });
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to mark step as failed'
            };
        }
    }
    /**
     * Skip a workflow step
     */
    static skipStep(sessionId, step, reason) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            const now = new Date();
            // Update step status
            progress.steps[step] = {
                ...progress.steps[step],
                status: 'skipped',
                progress: 100,
                completedAt: now,
                message: reason || `${step.toLowerCase().replace('_', ' ')} skipped`
            };
            progress.lastUpdated = now;
            progress.overallProgress = this.calculateOverallProgress(progress);
            this.progressData.set(sessionId, progress);
            this.emitEvent(sessionId, {
                type: 'step_completed',
                sessionId,
                step,
                data: progress.steps[step],
                timestamp: now
            });
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to skip step'
            };
        }
    }
    /**
     * Set current workflow step
     */
    static setCurrentStep(sessionId, step) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            progress.currentStep = step;
            progress.lastUpdated = new Date();
            this.progressData.set(sessionId, progress);
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to set current step'
            };
        }
    }
    /**
     * Calculate estimated time remaining
     */
    static updateTimeEstimate(sessionId, estimatedMinutes) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            progress.estimatedTimeRemaining = estimatedMinutes;
            progress.lastUpdated = new Date();
            this.progressData.set(sessionId, progress);
            return {
                success: true,
                data: progress
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update time estimate'
            };
        }
    }
    /**
     * Add event listener for workflow events
     */
    static addEventListener(sessionId, listener) {
        const listeners = this.eventListeners.get(sessionId) || [];
        listeners.push(listener);
        this.eventListeners.set(sessionId, listeners);
    }
    /**
     * Remove event listener
     */
    static removeEventListener(sessionId, listener) {
        const listeners = this.eventListeners.get(sessionId);
        if (!listeners)
            return false;
        const index = listeners.indexOf(listener);
        if (index === -1)
            return false;
        listeners.splice(index, 1);
        if (listeners.length === 0) {
            this.eventListeners.delete(sessionId);
        }
        else {
            this.eventListeners.set(sessionId, listeners);
        }
        return true;
    }
    /**
     * Get progress summary
     */
    static getProgressSummary(sessionId) {
        try {
            const progressResult = this.getProgress(sessionId);
            if (!progressResult.success || !progressResult.data) {
                throw new Error('Progress data not found');
            }
            const progress = progressResult.data;
            const steps = Object.values(progress.steps);
            const completedSteps = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
            const totalSteps = steps.length - 1; // Exclude 'COMPLETED' step from count
            const hasErrors = steps.some(s => s.errors && s.errors.length > 0);
            const isCompleted = progress.currentStep === 'COMPLETED';
            return {
                success: true,
                data: {
                    currentStep: progress.currentStep,
                    overallProgress: progress.overallProgress,
                    completedSteps,
                    totalSteps,
                    hasErrors,
                    isCompleted
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get progress summary'
            };
        }
    }
    /**
     * Clear progress data (cleanup)
     */
    static clearProgress(sessionId) {
        this.progressData.delete(sessionId);
        this.eventListeners.delete(sessionId);
    }
    /**
     * Get all active progress sessions
     */
    static getActiveSessions() {
        return Array.from(this.progressData.keys());
    }
    /**
     * Calculate overall progress based on step completion
     */
    static calculateOverallProgress(progress) {
        const steps = Object.values(progress.steps);
        const totalSteps = steps.length - 1; // Exclude 'COMPLETED' step
        if (totalSteps === 0)
            return 0;
        let totalProgress = 0;
        for (let i = 0; i < totalSteps; i++) {
            const step = steps[i];
            if (!step)
                continue; // Skip if step is undefined
            if (step.status === 'completed' || step.status === 'skipped') {
                totalProgress += 100;
            }
            else if (step.status === 'in_progress') {
                totalProgress += step.progress;
            }
        }
        return Math.round(totalProgress / totalSteps);
    }
    /**
     * Emit workflow event to listeners
     */
    static emitEvent(sessionId, event) {
        const listeners = this.eventListeners.get(sessionId);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(event);
                }
                catch (error) {
                    console.warn('Error in workflow event listener:', error);
                }
            });
        }
    }
}
exports.WorkflowProgressTracker = WorkflowProgressTracker;
WorkflowProgressTracker.progressData = new Map();
WorkflowProgressTracker.eventListeners = new Map();
