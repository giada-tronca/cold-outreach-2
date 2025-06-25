export interface EnrichmentOptions {
    includeCompanyInfo: boolean;
    includePersonalInfo: boolean;
    includeContactDetails: boolean;
    includeSocialProfiles: boolean;
}

export interface EnrichmentServices {
    proxycurl: boolean;
    firecrawl: boolean;
    builtwith: boolean;
}

export interface ProspectEnrichmentJobData {
    prospectId: string;
    userId: string;
    linkedinUrl?: string;
    workflowSessionId: string;
    batchId: string;
    campaignId: number;
    aiProvider: 'gemini' | 'openrouter';
    llmModelId: string;
    enrichmentOptions: EnrichmentOptions;
    services: EnrichmentServices;
}

export interface EnrichmentProspect {
    id: string;
    name: string;
    email: string;
    company: string;
    title: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    retryCount: number;
}

export interface EnrichmentJob {
    id: string;
    workflowSessionId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    totalProspects: number;
    processedProspects: number;
    completedProspects: number;
    failedProspects: number;
    currentBatch: number;
    totalBatches: number;
    progress: number;
    startedAt: string;
    processingRate: number;
    configuration: {
        campaignId: number;
        concurrency: number;
        aiProvider: string;
        llmModelId: string;
        [key: string]: any;
    };
    prospects: EnrichmentProspect[];
    errors: string[];
    createdAt: string;
    updatedAt: string;
    batchId?: string;
} 