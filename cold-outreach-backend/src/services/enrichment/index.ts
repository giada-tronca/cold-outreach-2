import { prisma } from '@/config/database'
import { ApiConfigurationService } from './apiConfigurationService'
import { ProxycurlService, EnrichedPersonData, EnrichedCompanyData } from './proxycurlService'
import { FirecrawlService, CompanyWebsiteData } from './firecrawlService'
import { BuiltWithService, TechStackData } from './builtwithService'
import { DatabaseError } from '@/utils/errors'

export interface EnrichmentResult {
    prospectId: number
    success: boolean
    data?: {
        personData?: EnrichedPersonData
        companyData?: EnrichedCompanyData
        websiteData?: CompanyWebsiteData
        techStack?: TechStackData
    }
    errors?: string[]
    processingTime?: number
}

export interface EnrichmentConfig {
    services: {
        proxycurl?: boolean
        firecrawl?: boolean
        builtwith?: boolean
    }
    options?: {
        timeout?: number
        retryAttempts?: number
        skipErrors?: boolean
        saveRawData?: boolean
    }
}

/**
 * Main Enrichment Service
 * Orchestrates all enrichment APIs and manages database updates
 */
export class EnrichmentService {
    /**
     * Enrich a single prospect with all configured services
     */
    static async enrichProspect(
        prospectId: number,
        config: EnrichmentConfig = { services: { proxycurl: true, firecrawl: true, builtwith: true } }
    ): Promise<EnrichmentResult> {
        const startTime = Date.now()
        const errors: string[] = []

        try {
            console.log(`🔍 [Enrichment]: Starting enrichment for prospect ${prospectId}`)

            // Get prospect from database
            const prospect = await prisma.prospect.findUnique({
                where: { id: prospectId },
                include: { enrichment: true }
            })

            if (!prospect) {
                throw new DatabaseError(`Prospect with ID ${prospectId} not found`)
            }

            // Update prospect and enrichment status
            await this.updateProspectStatus(prospectId, 'ENRICHING')

            const enrichmentData: EnrichmentResult['data'] = {}

            // LinkedIn enrichment with Proxycurl
            if (config.services.proxycurl && prospect.linkedinUrl) {
                try {
                    console.log(`🔍 [Enrichment]: Enriching LinkedIn profile for ${prospect.name}`)
                    enrichmentData.personData = await ProxycurlService.enrichPersonProfile(prospect.linkedinUrl)

                    // Try to get company LinkedIn URL and enrich company data
                    if (enrichmentData.personData.currentPosition?.company) {
                        const companyLinkedInUrl = await this.findCompanyLinkedInUrl(
                            enrichmentData.personData.currentPosition.company
                        )
                        if (companyLinkedInUrl) {
                            enrichmentData.companyData = await ProxycurlService.enrichCompanyProfile(companyLinkedInUrl)
                        }
                    }
                } catch (error) {
                    const message = `Proxycurl enrichment failed: ${error instanceof Error ? error.message : String(error)}`
                    errors.push(message)
                    console.error(`❌ [Enrichment]: ${message}`)

                    if (!config.options?.skipErrors) {
                        await this.updateProspectStatus(prospectId, 'FAILED', message)
                        throw new DatabaseError(message)
                    }
                }
            }

            // Website enrichment with Firecrawl
            if (config.services.firecrawl) {
                try {
                    const websiteUrl = await this.extractWebsiteUrl(prospect, enrichmentData.companyData)
                    if (websiteUrl) {
                        console.log(`🔍 [Enrichment]: Scraping website ${websiteUrl} for ${prospect.company}`)
                        enrichmentData.websiteData = await FirecrawlService.scrapeCompanyWebsite(websiteUrl)
                    }
                } catch (error) {
                    const message = `Firecrawl enrichment failed: ${error instanceof Error ? error.message : String(error)}`
                    errors.push(message)
                    console.error(`❌ [Enrichment]: ${message}`)

                    if (!config.options?.skipErrors) {
                        await this.updateProspectStatus(prospectId, 'FAILED', message)
                        throw new DatabaseError(message)
                    }
                }
            }

            // Technology stack analysis with BuiltWith
            if (config.services.builtwith) {
                try {
                    const domain = await this.extractDomain(prospect, enrichmentData.companyData, enrichmentData.websiteData)
                    if (domain) {
                        console.log(`🔍 [Enrichment]: Analyzing tech stack for ${domain}`)
                        // BuiltWith API key is optional - service will use mock data if not available
                        enrichmentData.techStack = await BuiltWithService.getTechStack(domain)
                    }
                } catch (error) {
                    const message = `BuiltWith enrichment failed: ${error instanceof Error ? error.message : String(error)}`
                    errors.push(message)
                    console.error(`❌ [Enrichment]: ${message}`)

                    // BuiltWith errors are non-critical since it provides mock data
                    // Don't fail the entire enrichment for BuiltWith issues
                }
            }

            // Save enrichment data to database
            await this.saveEnrichmentData(prospectId, enrichmentData, config.options?.saveRawData)

            // Update prospect status
            await this.updateProspectStatus(prospectId, 'ENRICHED')

            const processingTime = Date.now() - startTime
            console.log(`✅ [Enrichment]: Completed enrichment for prospect ${prospectId} in ${processingTime}ms`)

            return {
                prospectId,
                success: true,
                data: enrichmentData,
                ...(errors.length > 0 && { errors }),
                processingTime
            }

        } catch (error) {
            const processingTime = Date.now() - startTime
            const message = error instanceof Error ? error.message : String(error)

            console.error(`❌ [Enrichment]: Failed to enrich prospect ${prospectId}:`, error)

            // Update prospect status to failed
            await this.updateProspectStatus(prospectId, 'FAILED', message)

            return {
                prospectId,
                success: false,
                errors: [...errors, message],
                processingTime
            }
        }
    }

    /**
     * Enrich multiple prospects in batch
     */
    static async enrichProspects(
        prospectIds: number[],
        config: EnrichmentConfig = { services: { proxycurl: true, firecrawl: true, builtwith: true } }
    ): Promise<EnrichmentResult[]> {
        console.log(`🔍 [Enrichment]: Starting batch enrichment for ${prospectIds.length} prospects`)

        const modelConfig = await ApiConfigurationService.getModelConfiguration()
        const concurrency = modelConfig.concurrency || 3
        const delay = modelConfig.requestDelay || 1000

        const results: EnrichmentResult[] = []

        // Process prospects in chunks to respect rate limits
        for (let i = 0; i < prospectIds.length; i += concurrency) {
            const chunk = prospectIds.slice(i, i + concurrency)

            // Process chunk concurrently
            const chunkPromises = chunk.map(async (prospectId, index) => {
                // Add delay to stagger requests
                if (index > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay * index))
                }
                return this.enrichProspect(prospectId, config)
            })

            const chunkResults = await Promise.all(chunkPromises)
            results.push(...chunkResults)

            // Add delay between chunks
            if (i + concurrency < prospectIds.length) {
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }

        const successful = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length

        console.log(`✅ [Enrichment]: Batch enrichment completed: ${successful} successful, ${failed} failed`)

        return results
    }

    /**
     * Update prospect status in database
     */
    private static async updateProspectStatus(
        prospectId: number,
        status: 'ENRICHING' | 'ENRICHED' | 'FAILED',
        errorMessage?: string
    ): Promise<void> {
        try {
            await prisma.prospect.update({
                where: { id: prospectId },
                data: {
                    status,
                    ...(errorMessage && { errorMessage })
                }
            })

            // Also update/create enrichment record
            const enrichmentStatus = status === 'ENRICHING' ? 'PROCESSING' :
                status === 'ENRICHED' ? 'COMPLETED' : 'FAILED'

            await prisma.prospectEnrichment.upsert({
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
            })

        } catch (error) {
            console.error(`❌ [Enrichment]: Failed to update prospect status:`, error)
            // Don't throw here to avoid breaking the main enrichment flow
        }
    }

    /**
     * Save enrichment data to database
     */
    private static async saveEnrichmentData(
        prospectId: number,
        data: EnrichmentResult['data'],
        saveRawData: boolean = false
    ): Promise<void> {
        try {
            // Prepare enrichment data
            const enrichmentUpdate: any = {}

            // Company information
            if (data?.companyData || data?.websiteData) {
                if (data.companyData) {
                    enrichmentUpdate.companySummary = this.generateCompanySummary(data.companyData, data.websiteData)
                }
                if (data.websiteData?.url) {
                    enrichmentUpdate.companyWebsite = data.websiteData.url
                }
            }

            // LinkedIn summary
            if (data?.personData) {
                enrichmentUpdate.linkedinSummary = this.generateLinkedInSummary(data.personData)
            }

            // Technology stack
            if (data?.techStack) {
                enrichmentUpdate.techStack = {
                    domain: data.techStack.domain,
                    technologies: data.techStack.technologies,
                    summary: await BuiltWithService.getTechSummary(data.techStack.domain)
                }
            }

            // Raw data (optional)
            if (saveRawData) {
                enrichmentUpdate.enrichmentData = {
                    personData: data?.personData?.rawData,
                    companyData: data?.companyData?.rawData,
                    websiteData: data?.websiteData?.rawData,
                    techStack: data?.techStack?.rawData
                }
            }

            // Update prospect enrichment
            await prisma.prospectEnrichment.upsert({
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
            })

            console.log(`✅ [Enrichment]: Saved enrichment data for prospect ${prospectId}`)

        } catch (error) {
            console.error(`❌ [Enrichment]: Failed to save enrichment data:`, error)
            throw new DatabaseError('Failed to save enrichment data to database')
        }
    }

    /**
     * Extract website URL from available data
     */
    private static async extractWebsiteUrl(
        prospect: any,
        companyData?: EnrichedCompanyData
    ): Promise<string | null> {
        // Try company data first
        if (companyData?.website) {
            return companyData.website
        }

        // Try to extract from prospect data
        if (prospect.additionalData?.website) {
            return prospect.additionalData.website
        }

        // Try to guess from company name
        if (prospect.company) {
            const guessedUrl = `https://www.${prospect.company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`
            return guessedUrl
        }

        return null
    }

    /**
     * Extract domain from available data
     */
    private static async extractDomain(
        prospect: any,
        companyData?: EnrichedCompanyData,
        websiteData?: CompanyWebsiteData
    ): Promise<string | null> {
        // Try website data first
        if (websiteData?.url) {
            try {
                return new URL(websiteData.url).hostname
            } catch {
                // Invalid URL, continue
            }
        }

        // Try company data
        if (companyData?.website) {
            try {
                return new URL(companyData.website).hostname
            } catch {
                // Invalid URL, continue
            }
        }

        // Try to extract from prospect email domain
        if (prospect.email) {
            const emailDomain = prospect.email.split('@')[1]
            if (emailDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(emailDomain)) {
                return emailDomain
            }
        }

        return null
    }

    /**
     * Find company LinkedIn URL (placeholder - would implement search logic)
     */
    private static async findCompanyLinkedInUrl(companyName: string): Promise<string | null> {
        // This would typically use a search API or LinkedIn search
        // For now, return null to skip company LinkedIn enrichment
        console.log(`🔍 [Enrichment]: Company LinkedIn search not implemented for ${companyName}`)
        return null
    }

    /**
     * Generate company summary from enriched data
     */
    private static generateCompanySummary(
        companyData?: EnrichedCompanyData,
        websiteData?: CompanyWebsiteData
    ): string {
        const parts: string[] = []

        if (companyData?.name) {
            parts.push(`Company: ${companyData.name}`)
        }

        if (companyData?.industry || websiteData?.businessInfo?.industry) {
            const industry = companyData?.industry || websiteData?.businessInfo?.industry
            parts.push(`Industry: ${industry}`)
        }

        if (companyData?.description || websiteData?.description) {
            const description = companyData?.description || websiteData?.description
            parts.push(`Description: ${description}`)
        }

        if (companyData?.size) {
            parts.push(`Size: ${companyData.size}`)
        }

        if (websiteData?.businessInfo?.products?.length) {
            parts.push(`Products: ${websiteData.businessInfo.products.slice(0, 3).join(', ')}`)
        }

        return parts.join('\n') || 'No company summary available'
    }

    /**
     * Generate LinkedIn summary from person data
     */
    private static generateLinkedInSummary(personData: EnrichedPersonData): string {
        const parts: string[] = []

        if (personData.fullName) {
            parts.push(`Name: ${personData.fullName}`)
        }

        if (personData.headline) {
            parts.push(`Title: ${personData.headline}`)
        }

        if (personData.currentPosition) {
            parts.push(`Current Role: ${personData.currentPosition.title} at ${personData.currentPosition.company}`)
        }

        if (personData.location) {
            parts.push(`Location: ${personData.location}`)
        }

        if (personData.summary) {
            parts.push(`Summary: ${personData.summary.slice(0, 200)}...`)
        }

        return parts.join('\n') || 'No LinkedIn summary available'
    }

    /**
     * Validate API configuration
     */
    static async validateConfiguration(): Promise<{ valid: boolean; missing: string[] }> {
        return ApiConfigurationService.validateApiKeys(['proxycurlApiKey', 'firecrawlApiKey'])
    }
}

export * from './apiConfigurationService'
export * from './proxycurlService'
export * from './firecrawlService'
export * from './builtwithService' 