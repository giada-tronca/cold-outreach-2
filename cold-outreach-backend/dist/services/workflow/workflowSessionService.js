"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSessionService = void 0;
const errors_1 = require("@/utils/errors");
class WorkflowSessionService {
    /**
     * Create a new workflow session
     */
    static async createSession(options) {
        try {
            if (!options.userSessionId) {
                throw new errors_1.BadRequestError('User session ID is required');
            }
            const sessionId = this.generateSessionId();
            const session = {
                id: sessionId,
                userSessionId: options.userSessionId,
                campaignId: options.campaignId,
                currentStep: options.initialStep || 'UPLOAD_CSV',
                status: 'ACTIVE',
                configurationData: options.configuration || {},
                stepsCompleted: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.sessions.set(sessionId, session);
            return {
                success: true,
                data: session
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create workflow session'
            };
        }
    }
    /**
     * Get workflow session by ID
     */
    static async getSession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new errors_1.NotFoundError('Workflow session not found');
            }
            return {
                success: true,
                data: session
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get workflow session'
            };
        }
    }
    /**
     * Update workflow session
     */
    static async updateSession(sessionId, updates) {
        try {
            const existingSession = this.sessions.get(sessionId);
            if (!existingSession) {
                throw new errors_1.NotFoundError('Workflow session not found');
            }
            const updatedSession = {
                ...existingSession,
                ...updates,
                updatedAt: new Date()
            };
            this.sessions.set(sessionId, updatedSession);
            return {
                success: true,
                data: updatedSession
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update workflow session'
            };
        }
    }
    /**
     * Advance session to next step
     */
    static async advanceToNextStep(sessionId, nextStep) {
        try {
            const sessionResult = await this.getSession(sessionId);
            if (!sessionResult.success || !sessionResult.data) {
                throw new errors_1.NotFoundError('Workflow session not found');
            }
            const session = sessionResult.data;
            const stepsCompleted = session.stepsCompleted || [];
            if (!stepsCompleted.includes(session.currentStep)) {
                stepsCompleted.push(session.currentStep);
            }
            return await this.updateSession(sessionId, {
                currentStep: nextStep,
                stepsCompleted,
                status: nextStep === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE'
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to advance workflow session'
            };
        }
    }
    /**
     * Pause workflow session
     */
    static async pauseSession(sessionId) {
        try {
            return await this.updateSession(sessionId, {
                status: 'PAUSED'
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to pause workflow session'
            };
        }
    }
    /**
     * Resume workflow session
     */
    static async resumeSession(sessionId) {
        try {
            return await this.updateSession(sessionId, {
                status: 'ACTIVE',
                errorMessage: undefined // Clear any error message
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to resume workflow session'
            };
        }
    }
    /**
     * Mark session as completed
     */
    static async completeSession(sessionId) {
        try {
            return await this.updateSession(sessionId, {
                currentStep: 'COMPLETED',
                status: 'COMPLETED'
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to complete workflow session'
            };
        }
    }
    /**
     * Mark session as abandoned
     */
    static async abandonSession(sessionId, reason) {
        try {
            return await this.updateSession(sessionId, {
                status: 'ABANDONED',
                errorMessage: reason
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to abandon workflow session'
            };
        }
    }
    /**
     * Mark session as error state
     */
    static async errorSession(sessionId, errorMessage) {
        try {
            return await this.updateSession(sessionId, {
                status: 'ERROR',
                errorMessage
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to set workflow session error state'
            };
        }
    }
    /**
     * Delete workflow session
     */
    static async deleteSession(sessionId) {
        try {
            if (!sessionId) {
                throw new errors_1.BadRequestError('Session ID is required');
            }
            // Check if session exists
            const sessionResult = await this.getSession(sessionId);
            if (!sessionResult.success) {
                throw new errors_1.NotFoundError('Workflow session not found');
            }
            // Delete from mock storage
            this.sessions.delete(sessionId);
            // TODO: Replace with actual database operation
            // await prisma.workflowSession.delete({
            //   where: { id: sessionId }
            // });
            return {
                success: true,
                metadata: {
                    action: 'session_deleted',
                    timestamp: new Date()
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete workflow session'
            };
        }
    }
    /**
     * Find active session by user
     */
    static async findActiveSessionByUser(userSessionId) {
        try {
            // Mock storage search
            for (const session of this.sessions.values()) {
                if (session.userSessionId === userSessionId && session.status === 'ACTIVE') {
                    return {
                        success: true,
                        data: session
                    };
                }
            }
            // TODO: Replace with actual database operation
            // const session = await prisma.workflowSession.findFirst({
            //   where: {
            //     userSessionId,
            //     status: 'ACTIVE'
            //   },
            //   orderBy: { createdAt: 'desc' }
            // });
            return {
                success: false,
                error: 'No active session found for user'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to find active session'
            };
        }
    }
    /**
     * Search workflow sessions
     */
    static async searchSessions(options = {}) {
        try {
            // Mock storage search
            let filteredSessions = Array.from(this.sessions.values());
            // Apply filters
            if (options.userSessionId) {
                filteredSessions = filteredSessions.filter(s => s.userSessionId === options.userSessionId);
            }
            if (options.campaignId) {
                filteredSessions = filteredSessions.filter(s => s.campaignId === options.campaignId);
            }
            if (options.status) {
                filteredSessions = filteredSessions.filter(s => s.status === options.status);
            }
            if (options.currentStep) {
                filteredSessions = filteredSessions.filter(s => s.currentStep === options.currentStep);
            }
            if (options.createdAfter) {
                filteredSessions = filteredSessions.filter(s => s.createdAt > options.createdAfter);
            }
            if (options.createdBefore) {
                filteredSessions = filteredSessions.filter(s => s.createdAt < options.createdBefore);
            }
            // Apply pagination
            const total = filteredSessions.length;
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            const paginatedSessions = filteredSessions.slice(offset, offset + limit);
            const hasMore = offset + paginatedSessions.length < total;
            // TODO: Replace with actual database operation
            // const sessions = await prisma.workflowSession.findMany({
            //   where: filters,
            //   orderBy: { createdAt: 'desc' },
            //   take: limit,
            //   skip: offset
            // });
            return {
                success: true,
                data: {
                    sessions: paginatedSessions,
                    total,
                    hasMore
                },
                metadata: {
                    action: 'sessions_searched',
                    timestamp: new Date(),
                    filters: options,
                    resultCount: paginatedSessions.length
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search workflow sessions'
            };
        }
    }
    /**
     * Get session statistics
     */
    static async getSessionStatistics(timeRange) {
        try {
            // Mock statistics calculation
            const sessions = Array.from(this.sessions.values());
            let filteredSessions = sessions;
            if (timeRange) {
                filteredSessions = sessions.filter(s => s.createdAt >= timeRange.start && s.createdAt <= timeRange.end);
            }
            // Calculate statistics
            const total = filteredSessions.length;
            const byStatus = {
                'ACTIVE': 0,
                'PAUSED': 0,
                'COMPLETED': 0,
                'ABANDONED': 0,
                'ERROR': 0
            };
            const byStep = {
                'UPLOAD_CSV': 0,
                'CAMPAIGN_SETTINGS': 0,
                'ENRICHMENT_CONFIG': 0,
                'BEGIN_ENRICHMENT': 0,
                'EMAIL_GENERATION': 0,
                'COMPLETED': 0
            };
            filteredSessions.forEach(session => {
                byStatus[session.status]++;
                byStep[session.currentStep]++;
            });
            const completedSessions = filteredSessions.filter(s => s.status === 'COMPLETED');
            const completionRate = total > 0 ? (completedSessions.length / total) * 100 : 0;
            // Calculate average duration for completed sessions
            const durations = completedSessions.map(s => s.updatedAt.getTime() - s.createdAt.getTime());
            const averageDuration = durations.length > 0
                ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 1000 / 60 // minutes
                : 0;
            // Generate recent activity (last 7 days)
            const recentActivity = this.generateRecentActivity(filteredSessions);
            return {
                success: true,
                data: {
                    total,
                    byStatus,
                    byStep,
                    completionRate,
                    averageDuration,
                    recentActivity
                },
                metadata: {
                    action: 'statistics_calculated',
                    timestamp: new Date(),
                    timeRange
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get session statistics'
            };
        }
    }
    /**
     * Update session configuration
     */
    static async updateConfiguration(sessionId, configurationUpdates) {
        try {
            const sessionResult = await this.getSession(sessionId);
            if (!sessionResult.success || !sessionResult.data) {
                throw new errors_1.NotFoundError('Workflow session not found');
            }
            const session = sessionResult.data;
            const updatedConfiguration = {
                ...session.configurationData,
                ...configurationUpdates
            };
            return await this.updateSession(sessionId, {
                configurationData: updatedConfiguration
            });
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update session configuration'
            };
        }
    }
    /**
     * Generate unique session ID
     */
    static generateSessionId() {
        return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate recent activity data
     */
    static generateRecentActivity(sessions) {
        const activityMap = new Map();
        sessions.forEach(session => {
            const date = session.createdAt?.toISOString()?.split('T')[0];
            if (date) {
                activityMap.set(date, (activityMap.get(date) || 0) + 1);
            }
        });
        return Array.from(activityMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    /**
     * Get all sessions (for testing/debugging)
     */
    static getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Clear all sessions (for testing/debugging)
     */
    static clearAllSessions() {
        this.sessions.clear();
    }
}
exports.WorkflowSessionService = WorkflowSessionService;
// Mock in-memory storage (replace with database)
WorkflowSessionService.sessions = new Map();
