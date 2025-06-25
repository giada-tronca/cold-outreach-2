"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiConfigurationService = void 0;
const database_1 = require("@/config/database");
const errors_1 = require("@/utils/errors");
/**
 * API Configuration Service
 * Manages API keys and configuration settings from database
 */
class ApiConfigurationService {
    /**
     * Get API keys from database with caching
     */
    static async getApiKeys() {
        try {
            // Check if cache is still valid
            if (this.apiKeys && this.lastFetch &&
                (Date.now() - this.lastFetch.getTime()) < this.CACHE_DURATION) {
                return this.apiKeys;
            }
            // Fetch from database
            const config = await database_1.prisma.cOApiConfigurations.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            if (!config) {
                throw new errors_1.DatabaseError('No active API configuration found in database');
            }
            this.apiKeys = {};
            if (config.openrouterApiKey)
                this.apiKeys.openrouterApiKey = config.openrouterApiKey;
            if (config.geminiApiKey)
                this.apiKeys.geminiApiKey = config.geminiApiKey;
            if (config.firecrawlApiKey)
                this.apiKeys.firecrawlApiKey = config.firecrawlApiKey;
            if (config.proxycurlApiKey)
                this.apiKeys.proxycurlApiKey = config.proxycurlApiKey;
            this.lastFetch = new Date();
            return this.apiKeys;
        }
        catch (error) {
            console.error('Failed to fetch API keys:', error);
            throw new errors_1.DatabaseError('Failed to retrieve API configuration');
        }
    }
    /**
     * Get model configuration with defaults
     */
    static async getModelConfiguration() {
        try {
            // Check cache
            if (this.modelConfig && this.lastFetch &&
                (Date.now() - this.lastFetch.getTime()) < this.CACHE_DURATION) {
                return this.modelConfig;
            }
            const config = await database_1.prisma.cOApiConfigurations.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            let modelConfig = {
                timeout: 30000, // 30 seconds
                retryAttempts: 3,
                requestDelay: 1000, // 1 second between requests
                batchSize: 10,
                concurrency: 3,
            };
            // Use actual config fields since modelConfiguration doesn't exist
            if (config) {
                modelConfig = {
                    timeout: config.timeoutSeconds ? config.timeoutSeconds * 1000 : modelConfig.timeout,
                    retryAttempts: config.maxRetries || modelConfig.retryAttempts,
                    requestDelay: modelConfig.requestDelay, // No field in schema
                    batchSize: modelConfig.batchSize, // No field in schema
                    concurrency: modelConfig.concurrency, // No field in schema
                };
            }
            this.modelConfig = modelConfig;
            return modelConfig;
        }
        catch (error) {
            console.error('Failed to fetch model configuration:', error);
            // Return defaults on error
            return {
                timeout: 30000,
                retryAttempts: 3,
                requestDelay: 1000,
                batchSize: 10,
                concurrency: 3,
            };
        }
    }
    /**
     * Get specific API key
     */
    static async getApiKey(service) {
        const keys = await this.getApiKeys();
        const key = keys[service];
        if (!key) {
            throw new errors_1.DatabaseError(`${service} API key not found in configuration`);
        }
        return key;
    }
    /**
     * Clear cache (useful for testing or config updates)
     */
    static clearCache() {
        this.apiKeys = null;
        this.modelConfig = null;
        this.lastFetch = null;
    }
    /**
     * Validate API keys exist
     */
    static async validateApiKeys(requiredServices) {
        try {
            const keys = await this.getApiKeys();
            const missing = [];
            for (const service of requiredServices) {
                if (!keys[service]) {
                    missing.push(service);
                }
            }
            return {
                valid: missing.length === 0,
                missing
            };
        }
        catch (error) {
            return {
                valid: false,
                missing: requiredServices
            };
        }
    }
    /**
 * Get AI prompt from database by prompt type
 */
    static async getPrompt(promptType) {
        try {
            // Get the latest active prompt from CO_prompts table
            const promptRecord = await database_1.prisma.cOPrompts.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            if (!promptRecord) {
                throw new errors_1.DatabaseError('No active prompts found in CO_prompts table');
            }
            let prompt = null;
            switch (promptType) {
                case 'linkedin_summary_prompt':
                    prompt = promptRecord.linkedinSummaryPrompt;
                    break;
                case 'company_summary_prompt':
                    prompt = promptRecord.companySummaryPrompt;
                    break;
                case 'prospect_analysis_prompt':
                    prompt = promptRecord.prospectAnalysisPrompt;
                    break;
                case 'tech_stack_prompt':
                    prompt = promptRecord.techStackPrompt;
                    break;
            }
            if (!prompt) {
                throw new errors_1.DatabaseError(`${promptType} not found in prompts configuration`);
            }
            return prompt;
        }
        catch (error) {
            console.error(`Failed to fetch ${promptType}:`, error);
            throw new errors_1.DatabaseError(`Failed to retrieve ${promptType}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.ApiConfigurationService = ApiConfigurationService;
ApiConfigurationService.apiKeys = null;
ApiConfigurationService.modelConfig = null;
ApiConfigurationService.lastFetch = null;
ApiConfigurationService.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
