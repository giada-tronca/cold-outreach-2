import { PrismaClient } from '@prisma/client';

declare module '@prisma/client' {
  interface PrismaClient {
    // Legacy model aliases for backward compatibility
    prospect: PrismaClient['cOProspects'];
    campaign: PrismaClient['cOCampaigns'];
    batch: PrismaClient['cOBatches'];
    prospectEnrichment: PrismaClient['cOProspectEnrichments'];
    generatedEmail: PrismaClient['cOGeneratedEmails'];
    service: PrismaClient['cOServices'];
    apiConfiguration: PrismaClient['cOApiConfigurations'];
    prompt: PrismaClient['cOPrompts'];
    autoServiceSettings: PrismaClient['cOAutoServiceSettings'];
    workflowSession: PrismaClient['cOWorkflowSessions'];

    // Add some missing models that might be referenced
    fileUpload?: any;
    fileHistory?: any;
  }
}

// Export types for convenience
export type ProspectStatus = 'pending' | 'enriched' | 'failed' | 'completed';
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';
