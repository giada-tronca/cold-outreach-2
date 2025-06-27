// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Campaign Types - Updated to match Prisma schema
export interface Campaign {
  id: number;
  name: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: any; // JSON field that can be null, array, or object
  serviceId?: number | null;
  createdAt: string;
  updatedAt: string;
  // Additional fields from relations (when included)
  _count?: {
    prospects: number;
    batches: number;
  };
}

export interface CreateCampaignData {
  name: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: Record<string, any>;
  serviceId?: number;
}

export interface UpdateCampaignData {
  name?: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: Record<string, any>;
  serviceId?: number;
}

// Prospect Types - Updated to match backend Prisma schema
export interface Prospect {
  id: number;
  campaignId: number;
  batchId?: number;
  name?: string;
  email: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status:
    | 'PENDING'
    | 'ENRICHING'
    | 'ENRICHED'
    | 'GENERATING'
    | 'COMPLETED'
    | 'EMAIL_GENERATED'
    | 'FAILED';
  additionalData?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  campaign?: {
    id: number;
    name: string;
  };
  batch?: {
    id: number;
    name: string;
  };
  enrichment?: ProspectEnrichment;
  analysis?: ProspectAnalysis;
  generatedEmail?: GeneratedEmail;
}

export interface GeneratedEmail {
  prospectId: number;
  subject?: string;
  body?: string;
  generationStatus: string;
  errorMessage?: string;
  language?: string;
  generatedAt?: string;
  modelUsed?: string;
  generationMetadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectEnrichment {
  prospectId: number;
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  builtwithSummary?: string;
  techStack?: any;
  enrichmentData?: any;
  enrichmentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  prospect?: Prospect;
}

export interface ProspectAnalysis {
  prospectId: number;
  personalizationOpportunities?: any;
  painPoints?: any;
  marketPosition?: string;
  suggestedApproach?: string;
  executiveSummary?: string;
  confidenceScore?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  prospect?: Prospect;
}

export interface CreateProspectData {
  campaignId: number;
  email: string;
  name?: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
}

export interface UpdateProspectData {
  name?: string;
  email?: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status?:
    | 'PENDING'
    | 'ENRICHING'
    | 'ENRICHED'
    | 'GENERATING'
    | 'COMPLETED'
    | 'EMAIL_GENERATED'
    | 'FAILED';
}

export interface CreateEnrichmentData {
  prospectId: number;
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  builtwithSummary?: string;
  techStack?: any;
  enrichmentData?: any;
  enrichmentStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface UpdateEnrichmentData {
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  builtwithSummary?: string;
  techStack?: any;
  enrichmentData?: any;
  enrichmentStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface CreateAnalysisData {
  prospectId: number;
  personalizationOpportunities?: any;
  painPoints?: any;
  marketPosition?: string;
  suggestedApproach?: string;
  executiveSummary?: string;
  confidenceScore?: number;
}

export interface UpdateAnalysisData {
  personalizationOpportunities?: any;
  painPoints?: any;
  marketPosition?: string;
  suggestedApproach?: string;
  executiveSummary?: string;
  confidenceScore?: number;
}

export interface ProspectFilters {
  page?: number;
  limit?: number;
  search?: string;
  campaignId?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Workflow Types
export interface WorkflowSession {
  id: string;
  userId: string;
  currentStep: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data?: T[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
  error?: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Job and Progress Types
export interface JobProgress {
  jobId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

// Loading and Error States
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface FormErrors {
  [key: string]: string;
}
