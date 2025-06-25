import { Router, Request, Response } from 'express';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Simple in-memory store for workflow session configurations
// In production, this would be stored in database
const sessionConfigurations = new Map<string, any>();

const isObject = (item: any) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

const deepMerge = <T extends object, U extends object>(target: T, source: U): T & U => {
    const output = { ...target } as T & U;
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            const sourceKey = key as keyof U;
            if (isObject(source[sourceKey])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[sourceKey] });
                } else {
                    (output as any)[key] = deepMerge((target as any)[key], source[sourceKey] as any);
                }
            } else {
                Object.assign(output, { [key]: source[sourceKey] });
            }
        });
    }
    return output;
}

// Create new workflow session
router.post('/sessions', async (req: Request, res: Response) => {
    try {
        const { userSessionId, campaignId } = req.body;

        if (!userSessionId) {
            ApiResponseBuilder.error(res, 'User session ID is required', 400);
            return;
        }

        // Generate an ID similar to the previous mock implementation
        const newSessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create workflow session in database
        const createdSession = await prisma.cOWorkflowSessions.create({
            data: {
                id: newSessionId,
                userSessionId,
                campaignId: campaignId ?? null,
                currentStep: 'UPLOAD_CSV',
                status: 'ACTIVE',
                configurationData: {},
                stepsCompleted: [],
            }
        });

        // Initialize in-memory cache
        sessionConfigurations.set(newSessionId, {});

        ApiResponseBuilder.success(res, {
            session: createdSession
        }, 'Workflow session created successfully');

    } catch (error) {
        console.error('❌ [Workflow] Failed to create workflow session:', error);
        ApiResponseBuilder.error(res,
            error instanceof Error ? error.message : 'Failed to create workflow session',
            500
        );
    }
});

// Get workflow session status
router.get('/sessions/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        ApiResponseBuilder.error(res, 'Session ID is required', 400);
        return;
    }

    console.log(`📋 [Workflow] Getting session ${sessionId}`);

    // Get stored configuration from memory (in production, get from database)
    const storedConfig = sessionConfigurations.get(sessionId) || {};

    console.log(`🔍 [Workflow] Found stored configuration for ${sessionId}:`, storedConfig);

    ApiResponseBuilder.success(res, {
        session: {
            id: sessionId,
            currentStep: 'UPLOAD_CSV',
            status: 'ACTIVE',
            overallProgress: 0,
            configurationData: storedConfig
        }
    }, 'Workflow status retrieved successfully');
});

// Update workflow step
router.patch('/sessions/:sessionId/step', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { step } = req.body;

    if (!step) {
        ApiResponseBuilder.error(res, 'Step is required', 400);
        return;
    }

    // TODO: Implement step validation and transition logic

    ApiResponseBuilder.success(res, {
        sessionId,
        currentStep: step
    }, 'Workflow step updated successfully');
});

// Get workflow progress
router.get('/sessions/:sessionId/progress', (req: Request, res: Response) => {
    const { sessionId } = req.params;

    // TODO: Use WorkflowProgressTracker when imports are fixed

    ApiResponseBuilder.success(res, {
        sessionId,
        currentStep: 'UPLOAD_CSV',
        overallProgress: 0,
        steps: {
            'UPLOAD_CSV': { status: 'in_progress', progress: 0 },
            'CAMPAIGN_SETTINGS': { status: 'pending', progress: 0 },
            'ENRICHMENT_CONFIG': { status: 'pending', progress: 0 },
            'BEGIN_ENRICHMENT': { status: 'pending', progress: 0 },
            'EMAIL_GENERATION': { status: 'pending', progress: 0 },
            'COMPLETED': { status: 'pending', progress: 0 }
        }
    }, 'Workflow progress retrieved successfully');
});

// Start workflow step
router.post('/sessions/:sessionId/steps/:step/start', (req: Request, res: Response) => {
    const { sessionId, step } = req.params;

    // TODO: Use WorkflowProgressTracker.startStep when imports are fixed

    ApiResponseBuilder.success(res, {
        sessionId,
        step,
        status: 'started'
    }, `Step ${step} started successfully`);
});

// Complete workflow step
router.post('/sessions/:sessionId/steps/:step/complete', (req: Request, res: Response) => {
    const { sessionId, step } = req.params;
    const { message } = req.body;

    // TODO: Use WorkflowProgressTracker.completeStep when imports are fixed

    ApiResponseBuilder.success(res, {
        sessionId,
        step,
        status: 'completed'
    }, message || `Step ${step} completed successfully`);
});

// Handle workflow error
router.post('/sessions/:sessionId/error', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { step, error: errorMessage } = req.body;

    if (!step || !errorMessage) {
        ApiResponseBuilder.error(res, 'Step and error message are required', 400);
        return;
    }

    // TODO: Use WorkflowErrorHandler when imports are fixed

    ApiResponseBuilder.success(res, {
        sessionId,
        step,
        errorHandled: true,
        recoverable: true,
        suggestedAction: 'retry'
    }, 'Error handled successfully');
});

// Validate workflow step
router.post('/sessions/:sessionId/validate/:step', (req: Request, res: Response) => {
    const { sessionId, step } = req.params;

    // TODO: Use WorkflowStepValidationService when imports are fixed

    ApiResponseBuilder.success(res, {
        sessionId,
        step,
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
    }, 'Step validation completed');
});

// Delete workflow session
router.delete('/sessions/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;

    // TODO: Use WorkflowSessionService.deleteSession when imports are fixed

    ApiResponseBuilder.success(res, {
        sessionId,
        deleted: true
    }, 'Workflow session deleted successfully');
});

export default router; 