"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowManager = exports.WorkflowStateManager = exports.WorkflowProgressTracker = exports.WorkflowSessionService = void 0;
const workflowSessionService_1 = require("./workflowSessionService");
// import { WorkflowStepValidationService } from './workflowStepValidationService';
const workflowStateManager_1 = require("./workflowStateManager");
const workflowProgressTracker_1 = require("./workflowProgressTracker");
// import { WorkflowErrorHandler } from './workflowErrorHandler';
var workflowSessionService_2 = require("./workflowSessionService");
Object.defineProperty(exports, "WorkflowSessionService", { enumerable: true, get: function () { return workflowSessionService_2.WorkflowSessionService; } });
// export { WorkflowStepValidationService } from './workflowStepValidationService';
var workflowProgressTracker_2 = require("./workflowProgressTracker");
Object.defineProperty(exports, "WorkflowProgressTracker", { enumerable: true, get: function () { return workflowProgressTracker_2.WorkflowProgressTracker; } });
var workflowStateManager_2 = require("./workflowStateManager");
Object.defineProperty(exports, "WorkflowStateManager", { enumerable: true, get: function () { return workflowStateManager_2.WorkflowStateManager; } });
// export { WorkflowErrorHandler } from './workflowErrorHandler';
// Combined workflow manager that integrates all services
class WorkflowManager {
    static async createNewWorkflow(userSessionId, campaignId) {
        // Create workflow session
        const sessionResult = await workflowSessionService_1.WorkflowSessionService.createSession({
            userSessionId,
            campaignId,
            initialStep: 'UPLOAD_CSV'
        });
        if (!sessionResult.success || !sessionResult.data) {
            return sessionResult;
        }
        const session = sessionResult.data;
        // Initialize progress tracking
        const progressResult = workflowProgressTracker_1.WorkflowProgressTracker.initializeProgress(session.id);
        if (!progressResult.success) {
            return progressResult;
        }
        // Save initial state
        const stateResult = await workflowStateManager_1.WorkflowStateManager.saveState(session.id, session, progressResult.data, {});
        return {
            success: true,
            data: {
                session,
                progress: progressResult.data,
                state: stateResult.data
            }
        };
    }
    static async getWorkflowStatus(sessionId) {
        const sessionResult = await workflowSessionService_1.WorkflowSessionService.getSession(sessionId);
        const progressResult = workflowProgressTracker_1.WorkflowProgressTracker.getProgress(sessionId);
        const stateResult = await workflowStateManager_1.WorkflowStateManager.loadState(sessionId);
        return {
            success: true,
            data: {
                session: sessionResult.data,
                progress: progressResult.data,
                state: stateResult.data,
                hasErrors: progressResult.data ?
                    Object.values(progressResult.data.steps).some((s) => s.errors && s.errors.length > 0) :
                    false
            }
        };
    }
}
exports.WorkflowManager = WorkflowManager;
