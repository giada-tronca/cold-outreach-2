"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentService = void 0;
const database_1 = require("@/config/database");
const apiConfigurationService_1 = require("./apiConfigurationService");
const proxycurlService_1 = require("./proxycurlService");
const firecrawlService_1 = require("./firecrawlService");
const builtwithService_1 = require("./builtwithService");
const errors_1 = require("@/utils/errors");
/**
 * Main Enrichment Service
 * Orchestrates all enrichment APIs and manages database updates
 */
class EnrichmentService {
    /**
     * Enrich a single prospect with all configured services
     */
    static async enrichProspect(prospectId, config = { services: { proxycurl: true, firecrawl: true, builtwith: true } }) {
        const startTime = Date.now();
        const errors = [];
        try {
            console.log(`🔍 [Enrichment]: Starting enrichment for prospect ${prospectId}`);
            // Get prospect from database
            const prospect = await database_1.prisma.prospect.findUnique({
                where: { id: prospectId },
                include: { enrichment: true }
            });
            if (!prospect) {
                throw new errors_1.DatabaseError(`Prospect with ID ${prospectId} not found`);
            }
            // Update prospect and enrichment status
            await this.updateProspectStatus(prospectId, 'ENRICHING');
            const enrichmentData = {};
            // LinkedIn enrichment with Proxycurl
            if (config.services.proxycurl && prospect.linkedinUrl) {
                try {
                    console.log(`🔍 [Enrichment]: Enriching LinkedIn profile for ${prospect.name}`);
                    enrichmentData.personData = await proxycurlService_1.ProxycurlService.enrichPersonProfile(prospect.linkedinUrl);
                    // Try to get company LinkedIn URL and enrich company data
                    if (enrichmentData.personData.currentPosition?.company) {
                        const companyLinkedInUrl = await this.findCompanyLinkedInUrl(enrichmentData.personData.currentPosition.company);
                        if (companyLinkedInUrl) {
                            enrichmentData.companyData = await proxycurlService_1.ProxycurlService.enrichCompanyProfile(companyLinkedInUrl);
                        }
                    }
                }
                catch (error) {
                    const message = `Proxycurl enrichment failed: ${error instanceof Error ? error.message : String(error)}`;
                    errors.push(message);
                    console.error(`❌ [Enrichment]: ${message}`);
                    if (!config.options?.skipErrors) {
                        await this.updateProspectStatus(prospectId, 'FAILED', message);
                        throw new errors_1.DatabaseError(message);
                    }
                }
            }
            // Website enrichment with Firecrawl
            if (config.services.firecrawl) {
                try {
                    const websiteUrl = await this.extractWebsiteUrl(prospect, enrichmentData.companyData);
                    if (websiteUrl) {
                        console.log(`🔍 [Enrichment]: Scraping website ${websiteUrl} for ${prospect.company}`);
                        enrichmentData.websiteData = await firecrawlService_1.FirecrawlService.scrapeCompanyWebsite(websiteUrl);
                    }
                }
                catch (error) {
                    const message = `Firecrawl enrichment failed: ${error instanceof Error ? error.message : String(error)}`;
                    errors.push(message);
                    console.error(`❌ [Enrichment]: ${message}`);
                    if (!config.options?.skipErrors) {
                        await this.updateProspectStatus(prospectId, 'FAILED', message);
                        throw new errors_1.DatabaseError(message);
                    }
                }
            }
            // Technology stack analysis with BuiltWith
            if (config.services.builtwith) {
                try {
                    const domain = await this.extractDomain(prospect, enrichmentData.companyData, enrichmentData.websiteData);
                    if (domain) {
                        console.log(`🔍 [Enrichment]: Analyzing tech stack for ${domain}`);
                        // BuiltWith API key is optional - service will use mock data if not available
                        enrichmentData.techStack = await builtwithService_1.BuiltWithService.getTechStack(domain);
                    }
                }
                catch (error) {
                    const message = `BuiltWith enrichment failed: ${error instanceof Error ? error.message : String(error)}`;
                    errors.push(message);
                    console.error(`❌ [Enrichment]: ${message}`);
                    // BuiltWith errors are non-critical since it provides mock data
                    // Don't fail the entire enrichment for BuiltWith issues
                }
            }
            // Save enrichment data to database
            await this.saveEnrichmentData(prospectId, enrichmentData, config.options?.saveRawData);
            // Update prospect status
            await this.updateProspectStatus(prospectId, 'ENRICHED');
            const processingTime = Date.now() - startTime;
            console.log(`✅ [Enrichment]: Completed enrichment for prospect ${prospectId} in ${processingTime}ms`);
            return {
                prospectId,
                success: true,
                data: enrichmentData,
                ...(errors.length > 0 && { errors }),
                processingTime
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            const message = error instanceof Error ? error.message : String(error);
            console.error(`❌ [Enrichment]: Failed to enrich prospect ${prospectId}:`, error);
            // Update prospect status to failed
            await this.updateProspectStatus(prospectId, 'FAILED', message);
            return {
                prospectId,
                success: false,
                errors: [...errors, message],
                processingTime
            };
        }
    }
    /**
     * Enrich multiple prospects in batch
     */
    static async enrichProspects(prospectIds, config = { services: { proxycurl: true, firecrawl: true, builtwith: true } }) {
        console.log(`🔍 [Enrichment]: Starting batch enrichment for ${prospectIds.length} prospects`);
        const modelConfig = await apiConfigurationService_1.ApiConfigurationService.getModelConfiguration();
        const concurrency = modelConfig.concurrency || 3;
        const delay = modelConfig.requestDelay || 1000;
        const results = [];
        // Process prospects in chunks to respect rate limits
        for (let i = 0; i < prospectIds.length; i += concurrency) {
            const chunk = prospectIds.slice(i, i + concurrency);
            // Process chunk concurrently
            const chunkPromises = chunk.map(async (prospectId, index) => {
                // Add delay to stagger requests
                if (index > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay * index));
                }
                return this.enrichProspect(prospectId, config);
            });
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
            // Add delay between chunks
            if (i + concurrency < prospectIds.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`✅ [Enrichment]: Batch enrichment completed: ${successful} successful, ${failed} failed`);
        return results;
    }
    /**
     * Update prospect status in database
     */
    static async updateProspectStatus(prospectId, status, errorMessage) {
        try {
            await database_1.prisma.prospect.update({
                where: { id: prospectId },
                data: {
                    status,
                    ...(errorMessage && { errorMessage })
                }
            });
            // Also update/create enrichment record
            const enrichmentStatus = status === 'ENRICHING' ? 'PROCESSING' :
                status === 'ENRICHED' ? 'COMPLETED' : 'FAILED';
            await database_1.prisma.prospectEnrichment.upsert({
                where: { prospectId },
                create: {
                    prospectId,
                    enrichmentStatus,
                    ...(errorMessage && { errorMessage })
                },
                update: {
                    enrichmentStatus,
                    ...(errorMessage && { errorMessage })
                }
            });
        }
        catch (error) {
            console.error(`❌ [Enrichment]: Failed to update prospect status:`, error);
            // Don't throw here to avoid breaking the main enrichment flow
        }
    }
    /**
     * Save enrichment data to database
     */
    static async saveEnrichmentData(prospectId, data, saveRawData = false) {
        try {
            // Prepare enrichment data
            const enrichmentUpdate = {};
            // Company information
            if (data?.companyData || data?.websiteData) {
                if (data.companyData) {
                    enrichmentUpdate.companySummary = this.generateCompanySummary(data.companyData, data.websiteData);
                }
                if (data.websiteData?.url) {
                    enrichmentUpdate.companyWebsite = data.websiteData.url;
                }
            }
            // LinkedIn summary
            if (data?.personData) {
                enrichmentUpdate.linkedinSummary = this.generateLinkedInSummary(data.personData);
            }
            // Technology stack
            if (data?.techStack) {
                enrichmentUpdate.techStack = {
                    domain: data.techStack.domain,
                    technologies: data.techStack.technologies,
                    summary: await builtwithService_1.BuiltWithService.getTechSummary(data.techStack.domain)
                };
            }
            // Raw data (optional)
            if (saveRawData) {
                enrichmentUpdate.enrichmentData = {
                    personData: data?.personData?.rawData,
                    companyData: data?.companyData?.rawData,
                    websiteData: data?.websiteData?.rawData,
                    techStack: data?.techStack?.rawData
                };
            }
            // Update prospect enrichment
            await database_1.prisma.prospectEnrichment.upsert({
                where: { prospectId },
                create: {
                    prospectId,
                    enrichmentStatus: 'COMPLETED',
                    ...enrichmentUpdate
                },
                update: {
                    enrichmentStatus: 'COMPLETED',
                    ...enrichmentUpdate
                }
            });
            console.log(`✅ [Enrichment]: Saved enrichment data for prospect ${prospectId}`);
        }
        catch (error) {
            console.error(`❌ [Enrichment]: Failed to save enrichment data:`, error);
            throw new errors_1.DatabaseError('Failed to save enrichment data to database');
        }
    }
    /**
     * Extract website URL from available data
     */
    static async extractWebsiteUrl(prospect, companyData) {
        // Try company data first
        if (companyData?.website) {
            return companyData.website;
        }
        // Try to extract from prospect data
        if (prospect.additionalData?.website) {
            return prospect.additionalData.website;
        }
        // Try to guess from company name
        if (prospect.company) {
            const guessedUrl = `https://www.${prospect.company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`;
            return guessedUrl;
        }
        return null;
    }
    /**
     * Extract domain from available data
     */
    static async extractDomain(prospect, companyData, websiteData) {
        // Try website data first
        if (websiteData?.url) {
            try {
                return new URL(websiteData.url).hostname;
            }
            catch {
                // Invalid URL, continue
            }
        }
        // Try company data
        if (companyData?.website) {
            try {
                return new URL(companyData.website).hostname;
            }
            catch {
                // Invalid URL, continue
            }
        }
        // Try to extract from prospect email domain
        if (prospect.email) {
            const emailDomain = prospect.email.split('@')[1];
            if (emailDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(emailDomain)) {
                return emailDomain;
            }
        }
        return null;
    }
    /**
     * Find company LinkedIn URL (placeholder - would implement search logic)
     */
    static async findCompanyLinkedInUrl(companyName) {
        // This would typically use a search API or LinkedIn search
        // For now, return null to skip company LinkedIn enrichment
        console.log(`🔍 [Enrichment]: Company LinkedIn search not implemented for ${companyName}`);
        return null;
    }
    /**
     * Generate company summary from enriched data
     */
    static generateCompanySummary(companyData, websiteData) {
        const parts = [];
        if (companyData?.name) {
            parts.push(`Company: ${companyData.name}`);
        }
        if (companyData?.industry || websiteData?.businessInfo?.industry) {
            const industry = companyData?.industry || websiteData?.businessInfo?.industry;
            parts.push(`Industry: ${industry}`);
        }
        if (companyData?.description || websiteData?.description) {
            const description = companyData?.description || websiteData?.description;
            parts.push(`Description: ${description}`);
        }
        if (companyData?.size) {
            parts.push(`Size: ${companyData.size}`);
        }
        if (websiteData?.businessInfo?.products?.length) {
            parts.push(`Products: ${websiteData.businessInfo.products.slice(0, 3).join(', ')}`);
        }
        return parts.join('\n') || 'No company summary available';
    }
    /**
     * Generate LinkedIn summary from person data
     */
    static generateLinkedInSummary(personData) {
        const parts = [];
        if (personData.fullName) {
            parts.push(`Name: ${personData.fullName}`);
        }
        if (personData.headline) {
            parts.push(`Title: ${personData.headline}`);
        }
        if (personData.currentPosition) {
            parts.push(`Current Role: ${personData.currentPosition.title} at ${personData.currentPosition.company}`);
        }
        if (personData.location) {
            parts.push(`Location: ${personData.location}`);
        }
        if (personData.summary) {
            parts.push(`Summary: ${personData.summary.slice(0, 200)}...`);
        }
        return parts.join('\n') || 'No LinkedIn summary available';
    }
    /**
     * Validate API configuration
     */
    static async validateConfiguration() {
        return apiConfigurationService_1.ApiConfigurationService.validateApiKeys(['proxycurlApiKey', 'firecrawlApiKey']);
    }
}
exports.EnrichmentService = EnrichmentService;
__exportStar(require("./apiConfigurationService"), exports);
__exportStar(require("./proxycurlService"), exports);
__exportStar(require("./firecrawlService"), exports);
__exportStar(require("./builtwithService"), exports);
