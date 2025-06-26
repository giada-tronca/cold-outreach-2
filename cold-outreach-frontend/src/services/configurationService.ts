import { apiClient } from './api';

export interface ApiConfiguration {
    hasOpenrouterApiKey: boolean;
    hasGeminiApiKey: boolean;
    hasFirecrawlApiKey: boolean;
    hasProxycurlApiKey: boolean;
    modelConfiguration: {
        timeout?: number;
        retryAttempts?: number;
        requestDelay?: number;
        batchSize?: number;
        concurrency?: number;
    };
    selfCompanyInfo?: string;
}

export interface ApiValidation {
    valid: boolean;
    missing: string[];
}

export interface SelfCompanyInfoResponse {
    selfCompanyInfo: string | null;
}

/**
 * Configuration Service
 * Handles API configuration and settings
 */
export class ConfigurationService {
    /**
     * Get current API configuration
     */
    static async getApiConfiguration(): Promise<ApiConfiguration> {
        try {
            const response = await apiClient.get('/api/configuration');
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Failed to get API configuration:', error);
            throw new Error('Failed to retrieve API configuration');
        }
    }

    /**
 * Get self company information
 */
    static async getSelfCompanyInfo(): Promise<string | null> {
        try {
            const response = await apiClient.get('/api/configuration/company-info');
            const data = await response.json();
            return data.data.selfCompanyInfo;
        } catch (error) {
            console.error('Failed to get self company info:', error);
            throw new Error('Failed to retrieve self company information');
        }
    }

    /**
     * Update self company information
     */
    static async updateSelfCompanyInfo(selfCompanyInfo: string): Promise<void> {
        try {
            const response = await apiClient.put('/api/configuration/company-info', { selfCompanyInfo });
            if (!response.ok) {
                throw new Error('Failed to update self company information');
            }
        } catch (error) {
            console.error('Failed to update self company info:', error);
            throw new Error('Failed to update self company information');
        }
    }

    /**
     * Validate API configuration
     */
    static async validateApiConfiguration(): Promise<ApiValidation> {
        try {
            const response = await apiClient.get('/api/configuration/validate');
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Failed to validate API configuration:', error);
            throw new Error('Failed to validate API configuration');
        }
    }
}

export default ConfigurationService; 