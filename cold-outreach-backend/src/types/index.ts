import { Request } from 'express';

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Prospect Types
export interface Prospect {
  id: number;
  email: string;
  name: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  campaignId: number;
  batchId?: number;
  status: string;
  additionalData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Job Types
export interface JobData {
  id: string;
  type: 'email_generation' | 'prospect_enrichment' | 'csv_processing';
  payload: Record<string, unknown>;
  userId: string;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  result?: unknown;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Authentication Types
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Configuration Types
export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  url: string;
}

export interface AIConfig {
  openRouterApiKey: string;
  geminiApiKey: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  ai: AIConfig;
}

// Service Types
export interface EnrichmentService {
  enrichProspect(prospect: Prospect): Promise<Prospect>;
}

export interface EmailGenerationService {
  generateEmail(prospect: Prospect, template: string): Promise<string>;
}

// Generated TypeScript types for database models
// Updated to match current database structure

export interface COApiConfigurations {
  id: number;
  openrouterApiKey?: string;
  geminiApiKey?: string;
  firecrawlApiKey?: string;
  proxycurlApiKey?: string;
  industryMappings?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  defaultSignature?: string;
  personalEmailDomains?: string;
  geminiTemperature?: number;
  geminiMaxOutputTokens?: number;
  timeoutSeconds?: number;
  maxRetries?: number;
  domainKeywordsIndustry?: string;
}

export interface COAutoServiceSettings {
  id: number;
  description?: string;
  promptTemplate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface COBatches {
  id: number;
  campaignId: number;
  name: string;
  status: string;
  totalProspects: number;
  enrichedProspects: number;
  generatedEmails: number;
  failedProspects: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface COCampaigns {
  id: number;
  name: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: any;
  serviceId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface COGeneratedEmails {
  prospectId: number;
  subject?: string;
  body?: string;
  generationStatus: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  language?: string;
  generatedAt?: Date;
  modelUsed?: string;
  generationMetadata?: any;
}

export interface COPrompts {
  id: number;
  companySummaryPrompt?: string;
  linkedinSummaryPrompt?: string;
  techStackPrompt?: string;
  prospectAnalysisPrompt?: string;
  isActive: boolean;
  version?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface COProspectEnrichments {
  prospectId: number;
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  techStack?: any;
  enrichmentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  builtwithSummary?: string;
  enrichedAt?: Date;
  modelUsed?: string;
}

export interface COProspects {
  id: number;
  campaignId: number;
  batchId?: number;
  name: string;
  email: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status: string;
  additionalData?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  jobTitle?: string;
  phone?: string;
  location?: string;
  companyEmployees?: string;
  companyIndustries?: string;
  companyKeywords?: string;
  usesFallback?: boolean;
  metadata?: Record<string, any>;
}

export interface COServices {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  promptTemplate?: string;
}

export interface COWorkflowSessions {
  id: string;
  userSessionId: string;
  campaignId?: number;
  currentStep: string;
  status: string;
  configurationData?: any;
  stepsCompleted?: any;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profiles {
  id: number;
  name: string;
  apiKey?: string;
  temperature?: string;
  maxTokens?: string;
  topK?: string;
  topP?: string;
  maxEmailHistory?: string;
  emailHistoryMaxLength?: string;
  customPrompt?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Input types for API operations
export interface CreateCOProspectsInput {
  campaignId: number;
  batchId?: number;
  name: string;
  email: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status?: string;
  additionalData?: Record<string, any>;
  errorMessage?: string;
  jobTitle?: string;
  phone?: string;
  location?: string;
  companyEmployees?: string;
  companyIndustries?: string;
  companyKeywords?: string;
  usesFallback?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateCOProspectsInput {
  campaignId?: number;
  batchId?: number;
  name?: string;
  email?: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status?: string;
  additionalData?: any;
  errorMessage?: string;
  jobTitle?: string;
  phone?: string;
  location?: string;
  companyEmployees?: string;
  companyIndustries?: string;
  companyKeywords?: string;
  usesFallback?: boolean;
}

export interface CreateCOCampaignsInput {
  name: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: any;
  serviceId?: number;
}

export interface UpdateCOCampaignsInput {
  name?: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: any;
  serviceId?: number;
}

export interface CreateCOBatchesInput {
  campaignId: number;
  name: string;
  status?: string;
  totalProspects?: number;
  enrichedProspects?: number;
  generatedEmails?: number;
  failedProspects?: number;
  errorMessage?: string;
}

export interface UpdateCOBatchesInput {
  campaignId?: number;
  name?: string;
  status?: string;
  totalProspects?: number;
  enrichedProspects?: number;
  generatedEmails?: number;
  failedProspects?: number;
  errorMessage?: string;
}

// Enrichment related types
export interface EnrichmentData {
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  techStack?: any;
  builtwithSummary?: string;
  modelUsed?: string;
}

// Prospect with enrichment data (for API responses)
export interface ProspectWithEnrichment extends COProspects {
  enrichment?: COProspectEnrichments;
  generatedEmail?: COGeneratedEmails;
  campaign?: COCampaigns;
  batch?: COBatches;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProspectListResponse {
  success: boolean;
  data: ProspectWithEnrichment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Status enums (matching database values)
export enum ProspectStatus {
  PENDING = 'PENDING',
  ENRICHING = 'ENRICHING',
  ENRICHED = 'ENRICHED',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum EnrichmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum GenerationStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum BatchStatus {
  UPLOADED = 'UPLOADED',
  ENRICHING = 'ENRICHING',
  ENRICHED = 'ENRICHED',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum WorkflowStep {
  UPLOAD_CSV = 'UPLOAD_CSV',
  CAMPAIGN_SETTINGS = 'CAMPAIGN_SETTINGS',
  ENRICHMENT_CONFIG = 'ENRICHMENT_CONFIG',
  BEGIN_ENRICHMENT = 'BEGIN_ENRICHMENT',
  EMAIL_GENERATION = 'EMAIL_GENERATION',
  COMPLETED = 'COMPLETED',
}

export enum WorkflowStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
  ERROR = 'ERROR',
}
