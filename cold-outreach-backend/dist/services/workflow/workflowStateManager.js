"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowStateManager = void 0;
class WorkflowStateManager {
    /**
     * Save workflow state
     */
    static async saveState(sessionId, session, progress, configuration) {
        try {
            const state = {
                session,
                progress,
                configuration,
                validationResults: {},
                errors: [],
                metadata: {
                    version: '1.0.0',
                    createdBy: session.userSessionId,
                    lastModifiedBy: session.userSessionId,
                    checkpoints: []
                }
            };
            this.stateStorage.set(sessionId, state);
            return {
                success: true,
                data: state
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save workflow state'
            };
        }
    }
    /**
     * Load workflow state
     */
    static async loadState(sessionId) {
        try {
            const state = this.stateStorage.get(sessionId);
            if (!state) {
                return {
                    success: false,
                    error: 'Workflow state not found'
                };
            }
            return {
                success: true,
                data: state
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to load workflow state'
            };
        }
    }
    /**
     * Create checkpoint for current state
     */
    static async createCheckpoint(sessionId, step, description) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot create checkpoint - state not found'
                };
            }
            const state = stateResult.data;
            const now = new Date();
            state.metadata.checkpoints.push({
                step,
                timestamp: now,
                state: {
                    description,
                    step,
                    progress: state.progress.overallProgress,
                    configuration: state.configuration
                }
            });
            this.stateStorage.set(sessionId, state);
            return {
                success: true
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create checkpoint'
            };
        }
    }
    /**
     * Restore from checkpoint
     */
    static async restoreFromCheckpoint(sessionId, checkpointIndex) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot restore checkpoint - state not found'
                };
            }
            const state = stateResult.data;
            const checkpoints = state.metadata.checkpoints;
            if (checkpointIndex < 0 || checkpointIndex >= checkpoints.length) {
                return {
                    success: false,
                    error: 'Invalid checkpoint index'
                };
            }
            const checkpoint = checkpoints[checkpointIndex];
            if (!checkpoint) {
                return {
                    success: false,
                    error: 'Checkpoint not found at specified index'
                };
            }
            // Restore state from checkpoint
            if (checkpoint.state.configuration) {
                state.configuration = checkpoint.state.configuration;
            }
            // Update session to checkpoint step
            state.session.currentStep = checkpoint.step;
            state.session.status = 'ACTIVE';
            state.session.updatedAt = new Date();
            // Create a new checkpoint for the restoration
            state.metadata.checkpoints.push({
                step: checkpoint.step,
                timestamp: new Date(),
                state: {
                    description: `Restored from checkpoint ${checkpointIndex}`,
                    step: checkpoint.step,
                    restoredFrom: checkpointIndex
                }
            });
            this.stateStorage.set(sessionId, state);
            return {
                success: true,
                data: state
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to restore from checkpoint'
            };
        }
    }
    /**
     * Get workflow history
     */
    static async getWorkflowHistory(sessionId) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot get history - state not found'
                };
            }
            const checkpoints = stateResult.data.metadata.checkpoints;
            const history = checkpoints.map(checkpoint => ({
                step: checkpoint.step,
                timestamp: checkpoint.timestamp,
                description: checkpoint.state.description,
                progress: checkpoint.state.progress
            }));
            return {
                success: true,
                data: history
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get workflow history'
            };
        }
    }
    /**
     * Update configuration
     */
    static async updateConfiguration(sessionId, configurationUpdates) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot update configuration - state not found'
                };
            }
            const state = stateResult.data;
            state.configuration = {
                ...state.configuration,
                ...configurationUpdates
            };
            this.stateStorage.set(sessionId, state);
            return {
                success: true,
                data: state
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update configuration'
            };
        }
    }
    /**
     * Add error to state
     */
    static async addError(sessionId, errorContext) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot add error - state not found'
                };
            }
            const state = stateResult.data;
            state.errors.push(errorContext);
            this.stateStorage.set(sessionId, state);
            return {
                success: true,
                data: state
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add error to state'
            };
        }
    }
    /**
     * Clear errors from state
     */
    static async clearErrors(sessionId) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot clear errors - state not found'
                };
            }
            const state = stateResult.data;
            state.errors = [];
            this.stateStorage.set(sessionId, state);
            return {
                success: true,
                data: state
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear errors from state'
            };
        }
    }
    /**
     * Export workflow state (for backup/migration)
     */
    static async exportState(sessionId) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot export state - state not found'
                };
            }
            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                sessionId,
                state: stateResult.data
            };
            const exportString = JSON.stringify(exportData, null, 2);
            return {
                success: true,
                data: exportString
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to export workflow state'
            };
        }
    }
    /**
     * Import workflow state (for restore/migration)
     */
    static async importState(sessionId, exportString) {
        try {
            const exportData = JSON.parse(exportString);
            if (!exportData.state) {
                return {
                    success: false,
                    error: 'Invalid export data - missing state'
                };
            }
            // Validate version compatibility
            if (exportData.version !== '1.0.0') {
                return {
                    success: false,
                    error: `Unsupported export version: ${exportData.version}`
                };
            }
            const state = exportData.state;
            // Update session ID to new one
            state.session.id = sessionId;
            state.metadata.lastModifiedBy = state.session.userSessionId;
            this.stateStorage.set(sessionId, state);
            return {
                success: true,
                data: state
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to import workflow state'
            };
        }
    }
    /**
     * Delete workflow state
     */
    static async deleteState(sessionId) {
        try {
            this.stateStorage.delete(sessionId);
            return {
                success: true
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete workflow state'
            };
        }
    }
    /**
     * Get state summary
     */
    static async getStateSummary(sessionId) {
        try {
            const stateResult = await this.loadState(sessionId);
            if (!stateResult.success || !stateResult.data) {
                return {
                    success: false,
                    error: 'Cannot get summary - state not found'
                };
            }
            const state = stateResult.data;
            // Check if configuration is reasonably complete
            const hasCSVConfig = !!state.configuration.csvUpload?.fileName;
            const hasCampaignConfig = !!state.configuration.campaignSettings?.campaignName;
            const configurationComplete = hasCSVConfig && hasCampaignConfig;
            return {
                success: true,
                data: {
                    currentStep: state.session.currentStep,
                    overallProgress: state.progress.overallProgress,
                    checkpointCount: state.metadata.checkpoints.length,
                    errorCount: state.errors.length,
                    lastModified: state.session.updatedAt,
                    configurationComplete
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get state summary'
            };
        }
    }
    /**
     * List all stored states
     */
    static async listStates() {
        try {
            const states = Array.from(this.stateStorage.entries()).map(([sessionId, state]) => ({
                sessionId,
                currentStep: state.session.currentStep,
                status: state.session.status,
                lastModified: state.session.updatedAt,
                checkpointCount: state.metadata.checkpoints.length
            }));
            return {
                success: true,
                data: states
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list workflow states'
            };
        }
    }
    /**
     * Clean up old states (for maintenance)
     */
    static async cleanupOldStates(olderThanDays = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            let deletedCount = 0;
            const sessionsToDelete = [];
            for (const [sessionId, state] of this.stateStorage.entries()) {
                if (state.session.updatedAt < cutoffDate) {
                    sessionsToDelete.push(sessionId);
                }
            }
            sessionsToDelete.forEach(sessionId => {
                this.stateStorage.delete(sessionId);
                deletedCount++;
            });
            return {
                success: true,
                data: {
                    deletedCount,
                    remainingCount: this.stateStorage.size
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to cleanup old states'
            };
        }
    }
}
exports.WorkflowStateManager = WorkflowStateManager;
WorkflowStateManager.stateStorage = new Map();
