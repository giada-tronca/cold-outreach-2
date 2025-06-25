// Workflow-related types and interfaces

export type WorkflowStep =
  | 'UPLOAD_CSV'
  | 'CAMPAIGN_SETTINGS'
  | 'ENRICHMENT_CONFIG'
  | 'BEGIN_ENRICHMENT'
  | 'EMAIL_GENERATION'
  | 'COMPLETED';

export type WorkflowStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'ERROR';

export interface WorkflowConfiguration {
  // CSV Upload Step
  csvUpload?: {
    fileName?: string;
    filePath?: string;
    fileSize?: number;
    rowCount?: number;
    headers?: string[];
    mappedFields?: Record<string, string>;
    validationErrors?: string[];
  };

  // Campaign Settings Step
  campaignSettings?: {
    campaignId?: number;
    campaignName?: string;
    emailSubject?: string;
    emailTemplate?: string;
    prompt?: string;
    serviceId?: number;
    enrichmentFlags?: Record<string, boolean>;
  };

  // Enrichment Configuration Step
  enrichmentConfig?: {
    selectedServices?: string[];
    costEstimate?: number;
    timeEstimate?: number;
    enrichmentSettings?: Record<string, any>;
    batchSize?: number;
    concurrency?: number;
  };

  // Begin Enrichment Step
  beginEnrichment?: {
    batchId?: number;
    jobId?: string;
    totalProspects?: number;
    enrichedProspects?: number;
    failedProspects?: number;
    startedAt?: Date;
    estimatedCompletion?: Date;
  };

  // Email Generation Step
  emailGeneration?: {
    jobId?: string;
    totalEmails?: number;
    generatedEmails?: number;
    failedEmails?: number;
    startedAt?: Date;
    estimatedCompletion?: Date;
  };
}

export interface WorkflowStepProgress {
  step: WorkflowStep;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0-100
  message?: string;
  startedAt?: Date;
  completedAt?: Date;
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface WorkflowProgress {
  currentStep: WorkflowStep;
  overallProgress: number; // 0-100
  steps: Record<WorkflowStep, WorkflowStepProgress>;
  estimatedTimeRemaining?: number; // in minutes
  startedAt: Date;
  lastUpdated: Date;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  canProceed: boolean;
  errors: WorkflowValidationError[];
  warnings: string[];
  missingRequirements: string[];
}

export interface WorkflowValidationError {
  step: WorkflowStep;
  field?: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface StepRequirements {
  required: string[];
  optional: string[];
  validations: Array<{
    field: string;
    type: 'required' | 'format' | 'range' | 'custom';
    rule: any;
    message: string;
  }>;
}

export interface WorkflowStepDefinition {
  step: WorkflowStep;
  name: string;
  description: string;
  requirements: StepRequirements;
  estimatedDuration: number; // in minutes
  canSkip: boolean;
  canRevert: boolean;
  dependencies: WorkflowStep[];
  nextSteps: WorkflowStep[];
}

export interface WorkflowTransition {
  from: WorkflowStep;
  to: WorkflowStep;
  action: 'next' | 'previous' | 'skip' | 'restart' | 'jump';
  conditions?: Array<{
    field: string;
    operator: 'exists' | 'equals' | 'gt' | 'lt' | 'gte' | 'lte';
    value?: any;
  }>;
}

export interface WorkflowSession {
  id: string;
  userSessionId: string;
  campaignId?: number;
  currentStep: WorkflowStep;
  status: WorkflowStatus;
  configurationData?: WorkflowConfiguration;
  stepsCompleted?: WorkflowStep[];
  progress?: WorkflowProgress;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowErrorContext {
  sessionId: string;
  step: WorkflowStep;
  action: string;
  error: Error;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  timestamp: Date;
  stackTrace?: string;
  requestData?: any;
}

export interface WorkflowRecoveryAction {
  type: 'retry' | 'skip' | 'restart' | 'manual' | 'abort';
  description: string;
  automated: boolean;
  conditions?: string[];
  handler?: string;
}

export interface WorkflowErrorDefinition {
  code: string;
  name: string;
  description: string;
  category: 'validation' | 'system' | 'external' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  recoveryActions: WorkflowRecoveryAction[];
  userMessage: string;
  technicalMessage: string;
}

export interface WorkflowState {
  session: WorkflowSession;
  progress: WorkflowProgress;
  configuration: WorkflowConfiguration;
  validationResults: Record<WorkflowStep, WorkflowValidationResult>;
  errors: WorkflowErrorContext[];
  metadata: {
    version: string;
    createdBy: string;
    lastModifiedBy: string;
    checkpoints: Array<{
      step: WorkflowStep;
      timestamp: Date;
      state: any;
    }>;
  };
}

export interface WorkflowEvent {
  type:
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'progress_updated'
    | 'error_occurred'
    | 'session_created'
    | 'session_updated'
    | 'session_completed';
  sessionId: string;
  step?: WorkflowStep;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface WorkflowMetrics {
  sessionId: string;
  totalDuration: number; // in minutes
  stepDurations: Record<WorkflowStep, number>;
  errorCount: number;
  retryCount: number;
  completionRate: number; // 0-100
  performanceScore: number; // 0-100
  bottlenecks: Array<{
    step: WorkflowStep;
    duration: number;
    reason: string;
  }>;
}

// Workflow operation result types
export interface WorkflowOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface WorkflowStepResult extends WorkflowOperationResult {
  step: WorkflowStep;
  nextStep?: WorkflowStep;
  progress: WorkflowStepProgress;
  canProceed: boolean;
  validationResult: WorkflowValidationResult;
}

// Workflow hook types for extensibility
export interface WorkflowHooks {
  beforeStepStart?: (
    step: WorkflowStep,
    context: WorkflowState
  ) => Promise<void>;
  afterStepComplete?: (
    step: WorkflowStep,
    context: WorkflowState
  ) => Promise<void>;
  onError?: (
    error: WorkflowErrorContext,
    context: WorkflowState
  ) => Promise<void>;
  onProgress?: (
    progress: WorkflowProgress,
    context: WorkflowState
  ) => Promise<void>;
  beforeTransition?: (
    transition: WorkflowTransition,
    context: WorkflowState
  ) => Promise<boolean>;
  afterTransition?: (
    transition: WorkflowTransition,
    context: WorkflowState
  ) => Promise<void>;
}
