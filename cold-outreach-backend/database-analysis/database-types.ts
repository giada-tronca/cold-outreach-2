// Generated TypeScript types for database models
// Generated on: 2025-06-23T17:49:13.003Z

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

export interface CreateCOApiConfigurationsInput {
  openrouterApiKey?: string;
  geminiApiKey?: string;
  firecrawlApiKey?: string;
  proxycurlApiKey?: string;
  industryMappings?: any;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt: Date;
  defaultSignature?: string;
  personalEmailDomains?: string;
  geminiTemperature?: number;
  geminiMaxOutputTokens?: number;
  timeoutSeconds?: number;
  maxRetries?: number;
  domainKeywordsIndustry?: string;
}

export interface UpdateCOApiConfigurationsInput {
  openrouterApiKey?: string;
  geminiApiKey?: string;
  firecrawlApiKey?: string;
  proxycurlApiKey?: string;
  industryMappings?: any;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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

export interface CreateCOAutoServiceSettingsInput {
  description?: string;
  promptTemplate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateCOAutoServiceSettingsInput {
  description?: string;
  promptTemplate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface COBatches {
  id: number;
  campaignId: number;
  name: string;
  status: any;
  totalProspects: number;
  enrichedProspects: number;
  generatedEmails: number;
  failedProspects: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCOBatchesInput {
  campaignId: number;
  name: string;
  status?: any;
  totalProspects?: number;
  enrichedProspects?: number;
  generatedEmails?: number;
  failedProspects?: number;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt: Date;
}

export interface UpdateCOBatchesInput {
  campaignId?: number;
  name?: string;
  status?: any;
  totalProspects?: number;
  enrichedProspects?: number;
  generatedEmails?: number;
  failedProspects?: number;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
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

export interface CreateCOCampaignsInput {
  name: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: any;
  serviceId?: number;
  createdAt?: Date;
  updatedAt: Date;
}

export interface UpdateCOCampaignsInput {
  name?: string;
  emailSubject?: string;
  prompt?: string;
  enrichmentFlags?: any;
  serviceId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface COGeneratedEmails {
  prospectId: number;
  subject?: string;
  body?: string;
  generationStatus: any;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  language?: string;
  generatedAt?: Date;
  modelUsed?: string;
  generationMetadata?: any;
}

export interface CreateCOGeneratedEmailsInput {
  prospectId: number;
  subject?: string;
  body?: string;
  generationStatus?: any;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt: Date;
  language?: string;
  generatedAt?: Date;
  modelUsed?: string;
  generationMetadata?: any;
}

export interface UpdateCOGeneratedEmailsInput {
  subject?: string;
  body?: string;
  generationStatus?: any;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
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

export interface CreateCOPromptsInput {
  companySummaryPrompt?: string;
  linkedinSummaryPrompt?: string;
  techStackPrompt?: string;
  prospectAnalysisPrompt?: string;
  isActive?: boolean;
  version?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateCOPromptsInput {
  companySummaryPrompt?: string;
  linkedinSummaryPrompt?: string;
  techStackPrompt?: string;
  prospectAnalysisPrompt?: string;
  isActive?: boolean;
  version?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface COProspectEnrichments {
  prospectId: number;
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  techStack?: any;
  enrichmentStatus: any;
  createdAt: Date;
  updatedAt: Date;
  builtwithSummary?: string;
  enrichedAt?: Date;
  modelUsed?: string;
}

export interface CreateCOProspectEnrichmentsInput {
  prospectId: number;
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  techStack?: any;
  enrichmentStatus?: any;
  createdAt?: Date;
  updatedAt: Date;
  builtwithSummary?: string;
  enrichedAt?: Date;
  modelUsed?: string;
}

export interface UpdateCOProspectEnrichmentsInput {
  companyWebsite?: string;
  companySummary?: string;
  linkedinSummary?: string;
  prospectAnalysisSummary?: string;
  techStack?: any;
  enrichmentStatus?: any;
  createdAt?: Date;
  updatedAt?: Date;
  builtwithSummary?: string;
  enrichedAt?: Date;
  modelUsed?: string;
}

export interface COProspects {
  id: number;
  campaignId: number;
  batchId?: number;
  name?: string;
  email: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status: any;
  additionalData?: any;
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
}

export interface CreateCOProspectsInput {
  campaignId: number;
  batchId?: number;
  name?: string;
  email: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status?: any;
  additionalData?: any;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt: Date;
  jobTitle?: string;
  phone?: string;
  location?: string;
  companyEmployees?: string;
  companyIndustries?: string;
  companyKeywords?: string;
  usesFallback?: boolean;
}

export interface UpdateCOProspectsInput {
  campaignId?: number;
  batchId?: number;
  name?: string;
  email?: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  status?: any;
  additionalData?: any;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
  jobTitle?: string;
  phone?: string;
  location?: string;
  companyEmployees?: string;
  companyIndustries?: string;
  companyKeywords?: string;
  usesFallback?: boolean;
}

export interface COServices {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  promptTemplate?: string;
}

export interface CreateCOServicesInput {
  name: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt: Date;
  promptTemplate?: string;
}

export interface UpdateCOServicesInput {
  name?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  promptTemplate?: string;
}

export interface COWorkflowSessions {
  id: string;
  userSessionId: string;
  campaignId?: number;
  currentStep: any;
  status: any;
  configurationData?: any;
  stepsCompleted?: any;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCOWorkflowSessionsInput {
  id: string;
  userSessionId: string;
  campaignId?: number;
  currentStep?: any;
  status?: any;
  configurationData?: any;
  stepsCompleted?: any;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt: Date;
}

export interface UpdateCOWorkflowSessionsInput {
  userSessionId?: string;
  campaignId?: number;
  currentStep?: any;
  status?: any;
  configurationData?: any;
  stepsCompleted?: any;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
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

export interface CreateProfilesInput {
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

export interface UpdateProfilesInput {
  name?: string;
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

