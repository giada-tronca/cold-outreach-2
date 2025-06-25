import { WorkflowSessionService } from './workflowSessionService';
// import { WorkflowStepValidationService } from './workflowStepValidationService';
import { WorkflowStateManager } from './workflowStateManager';
import { WorkflowProgressTracker } from './workflowProgressTracker';
// import { WorkflowErrorHandler } from './workflowErrorHandler';

export { WorkflowSessionService } from './workflowSessionService';
// export { WorkflowStepValidationService } from './workflowStepValidationService';
export { WorkflowProgressTracker } from './workflowProgressTracker';
export { WorkflowStateManager } from './workflowStateManager';
// export { WorkflowErrorHandler } from './workflowErrorHandler';

// Combined workflow manager that integrates all services
export class WorkflowManager {
    static async createNewWorkflow(
        userSessionId: string,
        campaignId?: number
    ) {
        // Create workflow session
        const sessionResult = await WorkflowSessionService.createSession({
            userSessionId,
            campaignId,
            initialStep: 'UPLOAD_CSV'
        });

        if (!sessionResult.success || !sessionResult.data) {
            return sessionResult;
        }

        const session = sessionResult.data;

        // Initialize progress tracking
        const progressResult = WorkflowProgressTracker.initializeProgress(session.id);
        if (!progressResult.success) {
            return progressResult;
        }

        // Save initial state
        const stateResult = await WorkflowStateManager.saveState(
            session.id,
            session,
            progressResult.data!,
            {}
        );

        return {
            success: true,
            data: {
                session,
                progress: progressResult.data,
                state: stateResult.data
            }
        };
    }

    static async getWorkflowStatus(sessionId: string) {
        const sessionResult = await WorkflowSessionService.getSession(sessionId);
        const progressResult = WorkflowProgressTracker.getProgress(sessionId);
        const stateResult = await WorkflowStateManager.loadState(sessionId);

        return {
            success: true,
            data: {
                session: sessionResult.data,
                progress: progressResult.data,
                state: stateResult.data,
                hasErrors: progressResult.data ?
                    Object.values(progressResult.data.steps).some((s: any) => s.errors && s.errors.length > 0) :
                    false
            }
        };
    }
} 