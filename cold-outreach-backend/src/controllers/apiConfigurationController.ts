import { Request, Response } from 'express'
import { ApiConfigurationService } from '@/services/enrichment/apiConfigurationService'
import { createSuccessResponse } from '@/utils/apiResponse'
import { asyncHandler } from '@/middleware/asyncHandler'
import { AppError } from '@/utils/errors'

/**
 * Get current API configuration
 */
export const getApiConfiguration = asyncHandler(async (req: Request, res: Response) => {
    try {
        const apiKeys = await ApiConfigurationService.getApiKeys()
        const modelConfig = await ApiConfigurationService.getModelConfiguration()
        const selfCompanyInfo = await ApiConfigurationService.getSelfCompanyInfo()

        // Don't expose actual API keys for security
        const sanitizedConfig = {
            hasOpenrouterApiKey: !!apiKeys.openrouterApiKey,
            hasGeminiApiKey: !!apiKeys.geminiApiKey,
            hasFirecrawlApiKey: !!apiKeys.firecrawlApiKey,
            hasProxycurlApiKey: !!apiKeys.proxycurlApiKey,
            modelConfiguration: modelConfig,
            selfCompanyInfo
        }

        res.json(createSuccessResponse(sanitizedConfig, 'API configuration retrieved successfully'))
    } catch (error) {
        throw new AppError(`Failed to get API configuration: ${error instanceof Error ? error.message : String(error)}`)
    }
})

/**
 * Get self company information
 */
export const getSelfCompanyInfo = asyncHandler(async (req: Request, res: Response) => {
    try {
        const selfCompanyInfo = await ApiConfigurationService.getSelfCompanyInfo()

        res.json(createSuccessResponse({ selfCompanyInfo }, 'Self company information retrieved successfully'))
    } catch (error) {
        throw new AppError(`Failed to get self company info: ${error instanceof Error ? error.message : String(error)}`)
    }
})

/**
 * Update self company information
 */
export const updateSelfCompanyInfo = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { selfCompanyInfo } = req.body

        if (!selfCompanyInfo || typeof selfCompanyInfo !== 'string') {
            throw new AppError('Self company info is required and must be a string', 400)
        }

        if (selfCompanyInfo.length > 5000) {
            throw new AppError('Self company info cannot exceed 5000 characters', 400)
        }

        await ApiConfigurationService.updateSelfCompanyInfo(selfCompanyInfo)

        res.json(createSuccessResponse({ selfCompanyInfo }, 'Self company information updated successfully'))
    } catch (error) {
        if (error instanceof AppError) {
            throw error
        }
        throw new AppError(`Failed to update self company info: ${error instanceof Error ? error.message : String(error)}`)
    }
})

/**
 * Validate API configuration
 */
export const validateApiConfiguration = asyncHandler(async (req: Request, res: Response) => {
    try {
        const requiredServices: ('proxycurlApiKey' | 'firecrawlApiKey' | 'geminiApiKey' | 'openrouterApiKey')[] =
            ['proxycurlApiKey', 'firecrawlApiKey', 'geminiApiKey', 'openrouterApiKey']
        const validation = await ApiConfigurationService.validateApiKeys(requiredServices)

        res.json(createSuccessResponse(validation, 'API configuration validation completed'))
    } catch (error) {
        throw new AppError(`Failed to validate API configuration: ${error instanceof Error ? error.message : String(error)}`)
    }
}) 