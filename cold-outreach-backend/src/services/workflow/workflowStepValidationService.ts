import {
    WorkflowStep,
    WorkflowStepDefinition,
    WorkflowValidationResult,
    WorkflowValidationError,
    WorkflowConfiguration
} from '@/types/workflow';

export class WorkflowStepValidationService {
    private static stepDefinitions: Record<WorkflowStep, WorkflowStepDefinition> = {
        'UPLOAD_CSV': {
            step: 'UPLOAD_CSV',
            name: 'Upload CSV File',
            description: 'Upload and validate CSV file with prospect data',
            requirements: {
                required: ['fileName', 'filePath', 'headers'],
                optional: ['mappedFields'],
                validations: []
            },
            estimatedDuration: 5,
            canSkip: false,
            canRevert: true,
            dependencies: [],
            nextSteps: ['CAMPAIGN_SETTINGS']
        },
        'CAMPAIGN_SETTINGS': {
            step: 'CAMPAIGN_SETTINGS',
            name: 'Campaign Settings',
            description: 'Configure campaign settings and templates',
            requirements: {
                required: ['campaignName', 'emailSubject'],
                optional: ['prompt', 'emailTemplate'],
                validations: []
            },
            estimatedDuration: 10,
            canSkip: false,
            canRevert: true,
            dependencies: ['UPLOAD_CSV'],
            nextSteps: ['ENRICHMENT_CONFIG']
        },
        'ENRICHMENT_CONFIG': {
            step: 'ENRICHMENT_CONFIG',
            name: 'Enrichment Configuration',
            description: 'Configure prospect enrichment settings',
            requirements: {
                required: ['selectedServices'],
                optional: ['enrichmentSettings', 'batchSize', 'concurrency'],
                validations: []
            },
            estimatedDuration: 5,
            canSkip: true,
            canRevert: true,
            dependencies: ['CAMPAIGN_SETTINGS'],
            nextSteps: ['BEGIN_ENRICHMENT']
        },
        'BEGIN_ENRICHMENT': {
            step: 'BEGIN_ENRICHMENT',
            name: 'Begin Enrichment',
            description: 'Start prospect enrichment process',
            requirements: {
                required: ['batchId'],
                optional: ['jobId'],
                validations: []
            },
            estimatedDuration: 30,
            canSkip: false,
            canRevert: false,
            dependencies: ['ENRICHMENT_CONFIG'],
            nextSteps: ['EMAIL_GENERATION']
        },
        'EMAIL_GENERATION': {
            step: 'EMAIL_GENERATION',
            name: 'Email Generation',
            description: 'Generate personalized emails for prospects',
            requirements: {
                required: [],
                optional: ['jobId'],
                validations: []
            },
            estimatedDuration: 20,
            canSkip: true,
            canRevert: false,
            dependencies: ['BEGIN_ENRICHMENT'],
            nextSteps: ['COMPLETED']
        },
        'COMPLETED': {
            step: 'COMPLETED',
            name: 'Workflow Completed',
            description: 'All workflow steps have been completed',
            requirements: {
                required: [],
                optional: [],
                validations: []
            },
            estimatedDuration: 0,
            canSkip: false,
            canRevert: false,
            dependencies: ['EMAIL_GENERATION'],
            nextSteps: []
        }
    };

    /**
     * Validate step configuration
     */
    static validateStep(
        step: WorkflowStep,
        configuration: WorkflowConfiguration
    ): WorkflowValidationResult {
        const stepDefinition = this.stepDefinitions[step];
        const errors: WorkflowValidationError[] = [];
        const warnings: string[] = [];
        const missingRequirements: string[] = [];

        const stepConfig = this.getStepConfiguration(step, configuration);

        stepDefinition.requirements.required.forEach(field => {
            if (!stepConfig || !(field in stepConfig)) {
                missingRequirements.push(field);
                errors.push({
                    step,
                    field,
                    message: `Required field '${field}' is missing`,
                    code: 'REQUIRED_FIELD_MISSING',
                    severity: 'error'
                });
            }
        });

        const isValid = errors.length === 0;
        const canProceed = isValid && missingRequirements.length === 0;

        return {
            isValid,
            canProceed,
            errors,
            warnings,
            missingRequirements
        };
    }

    /**
     * Validate step transition
     */
    static validateTransition(
        from: WorkflowStep,
        to: WorkflowStep,
        configuration: WorkflowConfiguration
    ): WorkflowValidationResult {
        const fromDefinition = this.stepDefinitions[from];
        const errors: WorkflowValidationError[] = [];

        if (!fromDefinition.nextSteps.includes(to)) {
            errors.push({
                step: from,
                message: `Invalid transition from ${from} to ${to}`,
                code: 'INVALID_TRANSITION',
                severity: 'error'
            });
        }

        return {
            isValid: errors.length === 0,
            canProceed: errors.length === 0,
            errors,
            warnings: [],
            missingRequirements: []
        };
    }

    /**
     * Get step definition
     */
    static getStepDefinition(step: WorkflowStep): WorkflowStepDefinition {
        return this.stepDefinitions[step];
    }

    /**
     * Get step configuration based on step type
     */
    private static getStepConfiguration(
        step: WorkflowStep,
        configuration: WorkflowConfiguration
    ): Record<string, any> | undefined {
        switch (step) {
            case 'UPLOAD_CSV':
                return configuration.csvUpload;
            case 'CAMPAIGN_SETTINGS':
                return configuration.campaignSettings;
            case 'ENRICHMENT_CONFIG':
                return configuration.enrichmentConfig;
            case 'BEGIN_ENRICHMENT':
                return configuration.beginEnrichment;
            case 'EMAIL_GENERATION':
                return configuration.emailGeneration;
            case 'COMPLETED':
                return {};
            default:
                return undefined;
        }
    }
} 