import { prisma } from '@/config/database'
import axios from 'axios'
import { ApiConfigurationService } from './apiConfigurationService'
import { FirecrawlService } from './firecrawlService'
import { DatabaseError } from '@/utils/errors'

interface LinkedInProfileData {
    public_identifier?: string
    first_name?: string
    last_name?: string
    full_name?: string
    headline?: string
    summary?: string
    country?: string
    city?: string
    state?: string
    experiences?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        company?: string
        title?: string
        description?: string
        location?: string
    }>
    education?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        field_of_study?: string
        degree_name?: string
        school?: string
        description?: string
    }>
    languages?: string[]
    accomplishment_organisations?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        org_name?: string
        title?: string
        description?: string
    }>
    certifications?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        name?: string
        license_number?: string
        display_source?: string
        authority?: string
        url?: string
    }>
    people_also_viewed?: Array<{
        link?: string
        name?: string
        summary?: string
        location?: string
    }>
    recommendations?: string[]
    activities?: Array<{
        title?: string
        link?: string
        activity_status?: string
    }>
}

export interface EnrichmentResponse {
    success: boolean
    prospect: {
        id: number
        email: string
        name: string
        linkedinUrl: string
        linkedinSummary?: string
        companySummary?: string
        techStack?: any[]
        prospectAnalysisSummary?: string
    }
    message: string
    data?: {
        profileData: LinkedInProfileData | null
        aiSummary: string
        aiProvider: 'gemini' | 'openrouter'
    }
    skipped?: boolean
}

export interface EnrichmentOptions {
    aiProvider?: 'gemini' | 'openrouter'
    llmModelId?: string
}

/**
 * Prospect Enricher Service
 * Handles LinkedIn profile enrichment using Proxycurl API
 */
export class ProspectEnricher {

    /**
     * Enrich existing prospect by ID with LinkedIn data
     */
    static async enrichExistingProspect(prospectId: number, linkedinUrl: string, options: EnrichmentOptions = {}): Promise<EnrichmentResponse> {
        try {
            console.log(`🔍 [ProspectEnricher]: Starting LinkedIn enrichment for prospect ID ${prospectId}`)

            // Step 1: Get prospect data from database
            const existingProspect = await prisma.prospect.findUnique({
                where: { id: prospectId },
                include: { enrichment: true }
            })

            if (!existingProspect) {
                return {
                    success: false,
                    prospect: {
                        id: prospectId,
                        email: '',
                        name: '',
                        linkedinUrl
                    },
                    message: `Prospect with ID ${prospectId} not found`
                }
            }

            // TypeScript type guard - existingProspect is guaranteed to be non-null after this point

            // Step 2: Check if LinkedIn summary already exists
            if (existingProspect.enrichment?.linkedinSummary) {
                console.log(`ℹ️ [ProspectEnricher]: Prospect ID ${prospectId} already has LinkedIn summary, skipping`)
                return {
                    success: true,
                    prospect: {
                        id: existingProspect.id,
                        email: existingProspect.email || '',
                        name: existingProspect.name || '',
                        linkedinUrl: existingProspect.linkedinUrl || linkedinUrl,
                        linkedinSummary: existingProspect.enrichment.linkedinSummary
                    },
                    message: 'LinkedIn summary already exists for this prospect',
                    skipped: true
                }
            }

            // Step 3: Fetch LinkedIn profile data from Proxycurl
            const profileData = await this.fetchLinkedInProfile(linkedinUrl)

            // Step 4: Generate AI summary from profile data
            const aiProvider = options.aiProvider || 'openrouter'
            const aiSummary = await this.generateAISummary(profileData, aiProvider)

            // Step 5: Update prospect with enrichment data
            const updatedProspect = await this.createOrUpdateProspect(
                existingProspect,
                profileData,
                linkedinUrl,
                existingProspect.email,
                aiSummary
            )

            console.log(`✅ [ProspectEnricher]: Successfully enriched prospect ID ${prospectId}`)

            return {
                success: true,
                prospect: {
                    id: updatedProspect.id,
                    email: updatedProspect.email || '',
                    name: updatedProspect.name || '',
                    linkedinUrl: updatedProspect.linkedinUrl || linkedinUrl,
                    linkedinSummary: aiSummary
                },
                message: 'LinkedIn enrichment completed successfully',
                data: {
                    profileData,
                    aiSummary,
                    aiProvider
                }
            }

        } catch (error) {
            console.error(`❌ [ProspectEnricher]: LinkedIn enrichment failed for prospect ID ${prospectId}:`, error)
            return {
                success: false,
                prospect: {
                    id: prospectId,
                    email: '',
                    name: '',
                    linkedinUrl
                },
                message: `LinkedIn enrichment failed: ${error instanceof Error ? error.message : String(error)}`
            }
        }
    }

    /**
     * Enrich prospect with LinkedIn data using Proxycurl
     */
    static async enrichWithProxycurl(linkedinUrl: string, options: EnrichmentOptions = {}): Promise<EnrichmentResponse> {
        try {
            console.log(`🔍 [ProspectEnricher]: Starting LinkedIn enrichment for ${linkedinUrl}`)

            // Step 1: Fetch LinkedIn profile data from Proxycurl
            const profileData = await this.fetchLinkedInProfile(linkedinUrl)

            // Extract email and phone for prospect matching
            const email = this.extractEmailFromProfile(profileData, linkedinUrl)
            const phone = this.extractPhoneFromProfile(profileData)

            if (!email) {
                throw new Error('Could not extract email from LinkedIn profile')
            }

            // Step 2: Check if prospect already exists in database
            const existingProspect = await this.findExistingProspect(email, phone)

            if (existingProspect) {
                // Check if LinkedIn summary already exists
                const enrichment = await prisma.prospectEnrichment.findUnique({
                    where: { prospectId: existingProspect.id }
                })

                if (enrichment?.linkedinSummary) {
                    console.log(`✅ [ProspectEnricher]: LinkedIn summary already exists for prospect ${existingProspect.id}`)
                    return {
                        success: true,
                        prospect: {
                            id: existingProspect.id,
                            email: existingProspect.email,
                            name: existingProspect.name || '',
                            linkedinUrl: existingProspect.linkedinUrl || linkedinUrl,
                            linkedinSummary: enrichment.linkedinSummary
                        },
                        message: 'LinkedIn summary already exists for this prospect',
                        skipped: true
                    }
                }
            }

            // Step 3: Generate AI summary from profile data
            const aiProvider = options.aiProvider || 'openrouter'
            const aiSummary = await this.generateAISummary(profileData, aiProvider)

            // Step 4: Create or update prospect with enrichment data
            const prospect = await this.createOrUpdateProspect(
                existingProspect,
                profileData,
                linkedinUrl,
                email,
                aiSummary
            )

            console.log(`✅ [ProspectEnricher]: Successfully enriched prospect ${prospect.id}`)

            return {
                success: true,
                prospect: {
                    id: prospect.id,
                    email: prospect.email || '',
                    name: prospect.name || '',
                    linkedinUrl: prospect.linkedinUrl || linkedinUrl,
                    linkedinSummary: aiSummary
                },
                message: 'LinkedIn enrichment completed successfully',
                data: {
                    profileData,
                    aiSummary,
                    aiProvider
                }
            }

        } catch (error) {
            console.error(`❌ [ProspectEnricher]: LinkedIn enrichment failed for ${linkedinUrl}:`, error)
            throw new DatabaseError(`LinkedIn enrichment failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Fetch LinkedIn profile data from Proxycurl API
     */
    private static async fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfileData> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('proxycurlApiKey')
            const config = await ApiConfigurationService.getModelConfiguration()

            const response = await axios.get('https://nubela.co/proxycurl/api/v2/linkedin', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    linkedin_profile_url: linkedinUrl,
                    extra: 'include',
                    github_profile_id: 'include',
                    facebook_profile_id: 'include',
                    twitter_profile_id: 'include',
                    personal_contact_number: 'include',
                    personal_email: 'include',
                    inferred_salary: 'include',
                    skills: 'include',
                    use_cache: 'if-present',
                    fallback_to_cache: 'on-error'
                },
                timeout: config.timeout || 30000
            })

            return response.data as LinkedInProfileData

        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status
                const message = error.response.data?.message || error.message
                throw new Error(`Proxycurl API error (${status}): ${message}`)
            }
            throw new Error(`Failed to fetch LinkedIn profile: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Extract email from LinkedIn profile data
     */
    private static extractEmailFromProfile(profileData: LinkedInProfileData, linkedinUrl: string): string | null {
        // Try to extract email from profile data (if available)
        // Since Proxycurl doesn't always provide email, we might need to derive it

        // For now, extract from LinkedIn URL or generate a placeholder
        // In a real scenario, you'd have this data from your prospect upload
        const identifier = profileData.public_identifier
        if (identifier) {
            return `${identifier}@linkedin-prospect.com` // Placeholder email pattern
        }

        // Extract from URL as fallback
        const urlMatch = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/)
        if (urlMatch) {
            return `${urlMatch[1]}@linkedin-prospect.com`
        }

        return null
    }

    /**
     * Extract phone from LinkedIn profile data
     */
    private static extractPhoneFromProfile(profileData: LinkedInProfileData): string | null {
        // Proxycurl might provide phone data in personal_contact_number field
        // This would require additional API parameters and might not always be available
        return null // For now, return null as phone extraction is not guaranteed
    }

    /**
     * Find existing prospect by email or phone
     */
    private static async findExistingProspect(email: string, phone?: string | null) {
        const whereConditions: any = {
            OR: [
                { email: email }
            ]
        }

        if (phone) {
            whereConditions.OR.push({ additionalData: { path: ['phone'], equals: phone } })
        }

        return await prisma.prospect.findFirst({
            where: whereConditions,
            include: {
                enrichment: true
            }
        })
    }

    /**
     * Generate AI summary from LinkedIn profile data
     */
    private static async generateAISummary(profileData: LinkedInProfileData, aiProvider: 'gemini' | 'openrouter'): Promise<string> {
        try {
            console.log(`🤖 [ProspectEnricher]: Generating AI summary using ${aiProvider}`)

            // Prepare profile data for AI processing
            const profileSummary = this.formatProfileDataForAI(profileData)

            if (aiProvider === 'gemini') {
                return await this.generateSummaryWithGemini(profileSummary)
            } else {
                return await this.generateSummaryWithOpenRouter(profileSummary)
            }

        } catch (error) {
            console.error('Failed to generate AI summary:', error)
            // Fallback to basic summary if AI generation fails
            return this.generateBasicSummary(profileData)
        }
    }

    /**
     * Generate summary using Google Gemini Flash 2.0
     */
    private static async generateSummaryWithGemini(profileSummary: string): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')
            const prompt = await ApiConfigurationService.getPrompt('linkedin_summary_prompt')

            // Replace placeholder with actual data
            const finalPrompt = prompt.replace('{linkedin_data_placeholder}', profileSummary)

            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                contents: [{
                    parts: [{
                        text: finalPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 300,
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const aiSummary = response.data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!aiSummary) {
                throw new Error('No AI summary returned from Gemini API')
            }

            console.log(`✅ [ProspectEnricher]: Generated summary with Gemini Flash 2.0 using database prompt`)
            return aiSummary

        } catch (error) {
            console.error('Failed to generate summary with Gemini:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate summary using OpenRouter O1-mini with retry logic
     */
    private static async generateSummaryWithOpenRouter(profileSummary: string): Promise<string> {
        const maxRetries = 3
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')
                const prompt = await ApiConfigurationService.getPrompt('linkedin_summary_prompt')

                // Replace placeholder with actual data
                const finalPrompt = prompt.replace('{linkedin_data_placeholder}', profileSummary)

                console.log(`🔗 [ProspectEnricher]: Making OpenRouter API call (attempt ${attempt}/${maxRetries})...`)
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'openai/o1-mini',
                    messages: [
                        {
                            role: 'user',
                            content: finalPrompt
                        }
                    ],
                    max_completion_tokens: 8000 // Increased from 2000 to handle O1-Mini reasoning + response
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000 // Increased from 90s to 120s for O1-Mini reasoning
                })

                console.log('🔍 [ProspectEnricher]: OpenRouter response status:', response.status)
                console.log('🔍 [ProspectEnricher]: OpenRouter response choices length:', response.data?.choices?.length || 0)

                const aiSummary = response.data.choices[0]?.message?.content?.trim()
                if (!aiSummary) {
                    console.error('❌ [ProspectEnricher]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2))
                    throw new Error('No AI summary returned from OpenRouter API')
                }

                console.log(`✅ [ProspectEnricher]: Generated summary with OpenRouter O1-mini using database prompt`)
                return aiSummary
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                console.error(`❌ [ProspectEnricher]: Attempt ${attempt} failed:`, lastError.message)

                if (axios.isAxiosError(error) && error.response) {
                    console.error('❌ [ProspectEnricher]: OpenRouter API error details:', {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        data: error.response.data
                    })

                    // Don't retry on certain errors
                    if (error.response.status === 401 || error.response.status === 403) {
                        throw new Error(`OpenRouter API authentication error: ${error.response.status}`)
                    }
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
                    console.log(`⏳ [ProspectEnricher]: Waiting ${delay}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        throw new Error(`OpenRouter API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
    }

    /**
     * Format profile data for AI processing
     */
    private static formatProfileDataForAI(profileData: LinkedInProfileData): string {
        const parts: string[] = []

        if (profileData.full_name) {
            parts.push(`Name: ${profileData.full_name}`)
        }

        if (profileData.headline) {
            parts.push(`Headline: ${profileData.headline}`)
        }

        if (profileData.summary) {
            parts.push(`Summary: ${profileData.summary}`)
        }

        if (profileData.experiences && profileData.experiences.length > 0) {
            parts.push('Experience:')
            profileData.experiences.slice(0, 3).forEach(exp => {
                if (exp.title && exp.company) {
                    parts.push(`- ${exp.title} at ${exp.company}`)
                    if (exp.description) {
                        parts.push(`  ${exp.description.slice(0, 100)}...`)
                    }
                }
            })
        }

        if (profileData.education && profileData.education.length > 0) {
            parts.push('Education:')
            profileData.education.slice(0, 2).forEach(edu => {
                if (edu.school) {
                    const degree = edu.degree_name ? `${edu.degree_name} in ` : ''
                    const field = edu.field_of_study || ''
                    parts.push(`- ${degree}${field} at ${edu.school}`)
                }
            })
        }

        return parts.join('\n')
    }

    /**
     * Generate basic summary as fallback
     */
    private static generateBasicSummary(profileData: LinkedInProfileData): string {
        const parts: string[] = []

        if (profileData.full_name && profileData.headline) {
            parts.push(`${profileData.full_name} is a ${profileData.headline}.`)
        }

        if (profileData.experiences && profileData.experiences.length > 0) {
            const currentRole = profileData.experiences[0]
            if (currentRole?.title && currentRole?.company) {
                parts.push(`Currently working as ${currentRole.title} at ${currentRole.company}.`)
            }
        }

        if (profileData.summary) {
            parts.push(profileData.summary.slice(0, 200) + '...')
        }

        return parts.join(' ') || 'Professional LinkedIn profile'
    }

    /**
     * Enrich prospect with company information using Firecrawl
     */
    static async enrichWithCompanyData(prospectId: number, options: EnrichmentOptions = {}): Promise<EnrichmentResponse> {
        try {
            console.log(`🏢 [ProspectEnricher]: Starting company enrichment for prospect ID ${prospectId}`)

            // Step 1: Get prospect and check if company summary already exists
            const existingProspect = await prisma.prospect.findUnique({
                where: { id: prospectId },
                include: {
                    enrichment: true
                }
            })

            if (!existingProspect) {
                throw new Error(`Prospect with ID ${prospectId} not found`)
            }

            // Check if company summary already exists
            if (existingProspect.enrichment?.companySummary) {
                console.log(`✅ [ProspectEnricher]: Company summary already exists for prospect ${prospectId}`)
                return {
                    success: true,
                    prospect: {
                        id: existingProspect.id,
                        email: existingProspect.email || '',
                        name: existingProspect.name || '',
                        linkedinUrl: existingProspect.linkedinUrl || '',
                        companySummary: existingProspect.enrichment.companySummary
                    },
                    message: 'Company summary already exists for this prospect',
                    skipped: true
                }
            }

            // Step 2: Extract company website URL
            const companyWebsite = await this.extractCompanyWebsite(existingProspect)
            if (!companyWebsite) {
                throw new Error('Could not determine company website URL for enrichment')
            }

            console.log(`🌐 [ProspectEnricher]: Company website found: ${companyWebsite}`)

            // Step 3: Use Firecrawl to crawl website and generate summary
            const aiProvider = options.aiProvider || 'openrouter'
            const crawlResult = await FirecrawlService.crawlAndGenerateCompanySummary(companyWebsite, aiProvider)

            // Step 4: Update prospect enrichment with company data
            await prisma.prospectEnrichment.upsert({
                where: { prospectId: existingProspect.id },
                create: {
                    prospectId: existingProspect.id,
                    companyWebsite: companyWebsite,
                    companySummary: crawlResult.companySummary,
                    enrichmentStatus: 'COMPLETED',
                    modelUsed: aiProvider,
                    enrichedAt: new Date()
                },
                update: {
                    companyWebsite: companyWebsite,
                    companySummary: crawlResult.companySummary,
                    enrichmentStatus: 'COMPLETED',
                    modelUsed: aiProvider,
                    enrichedAt: new Date()
                }
            })

            console.log(`✅ [ProspectEnricher]: Successfully enriched company data for prospect ID ${prospectId}`)

            return {
                success: true,
                prospect: {
                    id: existingProspect.id,
                    email: existingProspect.email || '',
                    name: existingProspect.name || '',
                    linkedinUrl: existingProspect.linkedinUrl || '',
                    companySummary: crawlResult.companySummary
                },
                message: 'Company enrichment completed successfully',
                data: {
                    profileData: null as any, // Not applicable for company enrichment
                    aiSummary: crawlResult.companySummary,
                    aiProvider: aiProvider
                }
            }

        } catch (error) {
            console.error(`❌ [ProspectEnricher]: Company enrichment failed for prospect ID ${prospectId}:`, error)
            return {
                success: false,
                prospect: {
                    id: prospectId,
                    email: '',
                    name: '',
                    linkedinUrl: ''
                },
                message: `Company enrichment failed: ${error instanceof Error ? error.message : String(error)}`
            }
        }
    }

    /**
     * Extract company website URL from prospect data
     */
    private static async extractCompanyWebsite(prospect: any): Promise<string | null> {
        try {
            // 1. Check if company website is already in additional data
            if (prospect.additionalData?.companyWebsite) {
                return this.normalizeUrl(prospect.additionalData.companyWebsite)
            }

            // 2. Use the new Firecrawl method to extract company website from email domain
            if (prospect.email) {
                const websiteUrl = FirecrawlService.extractCompanyWebsiteFromEmail(prospect.email)
                if (websiteUrl) {
                    return websiteUrl
                }
            }

            // 3. Fallback: Generate potential website URLs from company name
            if (prospect.company) {
                const generatedUrl = this.generateCompanyWebsiteUrl(prospect.company)
                if (generatedUrl) return generatedUrl
            }

            return null

        } catch (error) {
            console.error('Failed to extract company website:', error)
            return null
        }
    }

    /**
     * Normalize and validate URL
     */
    private static normalizeUrl(url: string): string | null {
        try {
            // Remove common prefixes and clean up
            let cleanUrl = url.trim()
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('/')[0] // Take only domain part

            // Add https prefix
            const normalizedUrl = `https://${cleanUrl}`

            // Validate URL
            new URL(normalizedUrl)
            return normalizedUrl

        } catch {
            return null
        }
    }

    /**
     * Generate potential company website URL from company name
     */
    private static generateCompanyWebsiteUrl(companyName: string): string | null {
        try {
            // Clean company name
            const cleanName = companyName
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                .replace(/\s+/g, '') // Remove spaces
                .replace(/(inc|llc|ltd|corp|corporation|company|co)$/i, '') // Remove company suffixes

            if (cleanName.length < 2) return null

            // Try common TLD patterns
            const commonTlds = ['com', 'io', 'net', 'org']

            for (const tld of commonTlds) {
                const potentialUrl = `https://${cleanName}.${tld}`
                try {
                    new URL(potentialUrl)
                    return potentialUrl
                } catch {
                    continue
                }
            }

            return null

        } catch {
            return null
        }
    }

    /**
     * Enrich prospect with tech stack data using BuiltWith via Firecrawl
     */
    static async enrichWithTechStack(prospectId: number, options: EnrichmentOptions = {}): Promise<EnrichmentResponse> {
        try {
            console.log(`💻 [ProspectEnricher]: Starting tech stack enrichment for prospect ID ${prospectId}`)

            // Step 1: Get prospect and check if tech stack already exists
            const existingProspect = await prisma.cOProspects.findUnique({
                where: { id: prospectId },
                include: {
                    enrichment: true
                }
            })

            if (!existingProspect) {
                throw new Error(`Prospect with ID ${prospectId} not found`)
            }

            // Check if tech stack already exists
            if (existingProspect.enrichment?.techStack && Array.isArray(existingProspect.enrichment.techStack) && existingProspect.enrichment.techStack.length > 0) {
                console.log(`✅ [ProspectEnricher]: Tech stack already exists for prospect ${prospectId}`)
                return {
                    success: true,
                    prospect: {
                        id: existingProspect.id,
                        email: existingProspect.email || '',
                        name: existingProspect.name || '',
                        linkedinUrl: existingProspect.linkedinUrl || '',
                        techStack: existingProspect.enrichment.techStack
                    },
                    message: 'Tech stack already exists for this prospect',
                    skipped: true
                }
            }

            // Step 2: Extract company domain
            const companyDomain = await this.extractCompanyDomain(existingProspect)
            if (!companyDomain) {
                throw new Error('Could not determine company domain for BuiltWith analysis')
            }

            console.log(`🌐 [ProspectEnricher]: Company domain found: ${companyDomain}`)

            // Step 3: Use Firecrawl to scrape BuiltWith page
            const builtwithUrl = `https://builtwith.com/${companyDomain}`
            console.log(`🔍 [ProspectEnricher]: Scraping BuiltWith: ${builtwithUrl}`)

            const builtwithData = await FirecrawlService.scrapeCompanyWebsite(builtwithUrl)

            // Step 4: Use LLM to extract tech stack from BuiltWith content
            const aiProvider = options.aiProvider || 'openrouter'
            const techStackData = await this.extractTechStackWithAI(builtwithData.markdown || builtwithData.content || '', aiProvider)

            // Step 5: Update prospect enrichment with tech stack data
            await prisma.prospectEnrichment.upsert({
                where: { prospectId: existingProspect.id },
                create: {
                    prospectId: existingProspect.id,
                    techStack: techStackData,
                    enrichmentStatus: 'COMPLETED',
                    modelUsed: aiProvider,
                    enrichedAt: new Date()
                },
                update: {
                    techStack: techStackData,
                    enrichmentStatus: 'COMPLETED',
                    modelUsed: aiProvider,
                    enrichedAt: new Date()
                }
            })

            console.log(`✅ [ProspectEnricher]: Successfully enriched tech stack for prospect ID ${prospectId}`)

            return {
                success: true,
                prospect: {
                    id: existingProspect.id,
                    email: existingProspect.email || '',
                    name: existingProspect.name || '',
                    linkedinUrl: existingProspect.linkedinUrl || '',
                    techStack: techStackData
                },
                message: 'Tech stack enrichment completed successfully',
                data: {
                    profileData: null as any, // Not applicable for tech stack enrichment
                    aiSummary: `Tech stack analysis completed for ${companyDomain}`,
                    aiProvider: aiProvider
                }
            }

        } catch (error) {
            console.error(`❌ [ProspectEnricher]: Tech stack enrichment failed for prospect ID ${prospectId}:`, error)
            return {
                success: false,
                prospect: {
                    id: prospectId,
                    email: '',
                    name: '',
                    linkedinUrl: ''
                },
                message: `Tech stack enrichment failed: ${error instanceof Error ? error.message : String(error)}`
            }
        }
    }

    /**
     * Extract company domain from prospect data
     */
    private static async extractCompanyDomain(prospect: any): Promise<string | null> {
        try {
            // 1. Check if company website is already in additional data
            if (prospect.additionalData?.companyWebsite) {
                const domain = this.extractDomainFromUrl(prospect.additionalData.companyWebsite)
                if (domain) return domain
            }

            // 2. Check enrichment data for company website
            if (prospect.enrichment?.companyWebsite) {
                const domain = this.extractDomainFromUrl(prospect.enrichment.companyWebsite)
                if (domain) return domain
            }

            // 3. Note: enrichmentData field no longer exists in schema
            // Using available fields from prospect data instead

            // 4. Generate potential domain from company name
            if (prospect.company) {
                const generatedDomain = this.generateCompanyDomain(prospect.company)
                if (generatedDomain) return generatedDomain
            }

            return null

        } catch (error) {
            console.error('Failed to extract company domain:', error)
            return null
        }
    }

    /**
     * Extract domain from URL
     */
    private static extractDomainFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
            return urlObj.hostname.replace(/^www\./, '')
        } catch {
            return null
        }
    }

    /**
     * Generate potential company domain from company name
     */
    private static generateCompanyDomain(companyName: string): string | null {
        try {
            // Clean company name
            const cleanName = companyName
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                .replace(/\s+/g, '') // Remove spaces
                .replace(/(inc|llc|ltd|corp|corporation|company|co)$/i, '') // Remove company suffixes

            if (cleanName.length < 2) return null

            // Return the most likely domain (company.com)
            return `${cleanName}.com`

        } catch {
            return null
        }
    }

    /**
     * Extract tech stack using AI from BuiltWith content
     */
    private static async extractTechStackWithAI(builtwithContent: string, aiProvider: 'gemini' | 'openrouter'): Promise<any[]> {
        try {
            // Get tech stack analysis prompt from database
            const prompt = await ApiConfigurationService.getPrompt('tech_stack_prompt')

            // Replace placeholder with BuiltWith content
            const finalPrompt = prompt.replace('${BUILTWITH_CONTENT}', builtwithContent)

            // Generate AI analysis
            const aiResponse = await this.generateTechStackAnalysis(finalPrompt, aiProvider)

            // Parse AI response to extract structured tech stack data
            const techStackData = this.parseTechStackResponse(aiResponse)

            console.log(`✅ [ProspectEnricher]: Extracted ${techStackData.length} technologies using ${aiProvider}`)
            return techStackData

        } catch (error) {
            console.error(`❌ [ProspectEnricher]: Failed to extract tech stack with AI:`, error)
            // Return empty array instead of throwing to allow partial success
            return []
        }
    }

    /**
     * Generate tech stack analysis using AI
     */
    private static async generateTechStackAnalysis(prompt: string, aiProvider: 'gemini' | 'openrouter'): Promise<string> {
        try {
            if (aiProvider === 'gemini') {
                return await this.generateTechStackWithGemini(prompt)
            } else {
                return await this.generateTechStackWithOpenRouter(prompt)
            }
        } catch (error) {
            console.error(`❌ [ProspectEnricher]: Failed to generate tech stack analysis with ${aiProvider}:`, error)
            throw new Error(`Tech stack analysis failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate tech stack analysis using Google Gemini
     */
    private static async generateTechStackWithGemini(prompt: string): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')

            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1000,
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!aiResponse) {
                throw new Error('No tech stack analysis returned from Gemini API')
            }

            console.log(`✅ [ProspectEnricher]: Generated tech stack analysis with Gemini using database prompt`)
            return aiResponse

        } catch (error) {
            console.error('Failed to generate tech stack analysis with Gemini:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate tech stack analysis using OpenRouter with retry logic
     */
    private static async generateTechStackWithOpenRouter(prompt: string): Promise<string> {
        const maxRetries = 3
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')

                console.log(`🔗 [ProspectEnricher]: Making OpenRouter API call for tech stack (attempt ${attempt}/${maxRetries})...`)
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'openai/o1-mini',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_completion_tokens: 2500 // Increased for tech stack analysis + reasoning
                    // Note: temperature is not supported by o1-mini model
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 90000 // 90 seconds - o1-mini needs more time for reasoning
                })

                console.log('🔍 [ProspectEnricher]: OpenRouter tech stack response status:', response.status)
                console.log('🔍 [ProspectEnricher]: OpenRouter tech stack response choices length:', response.data?.choices?.length || 0)

                const aiResponse = response.data.choices[0]?.message?.content?.trim()
                if (!aiResponse) {
                    console.error('❌ [ProspectEnricher]: OpenRouter returned empty tech stack response:', JSON.stringify(response.data, null, 2))
                    throw new Error('No tech stack analysis returned from OpenRouter API')
                }

                console.log(`✅ [ProspectEnricher]: Generated tech stack analysis with OpenRouter using database prompt`)
                return aiResponse
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                console.error(`❌ [ProspectEnricher]: Tech stack attempt ${attempt} failed:`, lastError.message)

                if (axios.isAxiosError(error) && error.response) {
                    console.error('❌ [ProspectEnricher]: OpenRouter tech stack API error details:', {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        data: error.response.data
                    })

                    // Don't retry on certain errors
                    if (error.response.status === 401 || error.response.status === 403) {
                        throw new Error(`OpenRouter API authentication error: ${error.response.status}`)
                    }
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
                    console.log(`⏳ [ProspectEnricher]: Waiting ${delay}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        throw new Error(`OpenRouter tech stack API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
    }

    /**
     * Parse AI response to extract structured tech stack data
     */
    private static parseTechStackResponse(aiResponse: string): any[] {
        try {
            // Try to extract JSON from AI response
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const techStack = JSON.parse(jsonStr);

                if (Array.isArray(techStack)) {
                    return techStack;
                }
            }

            // Fallback: parse response line by line
            const lines = aiResponse.split('\n').filter(line => line.trim());
            const techStack: any[] = [];

            let currentCategory = 'Other';

            for (const line of lines) {
                const trimmedLine = line.trim();

                // Check if it's a category header
                if (trimmedLine.includes(':') && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
                    currentCategory = trimmedLine.replace(':', '').trim();
                    continue;
                }

                // Check if it's a technology item
                if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                    const techName = trimmedLine.replace(/^[-*]\s*/, '').trim();
                    if (techName) {
                        techStack.push({
                            name: techName,
                            category: currentCategory,
                            detected: true
                        });
                    }
                }
            }

            return techStack;

        } catch (error) {
            console.error('Failed to parse tech stack response:', error)
            console.log('AI Response:', aiResponse)

            // Return minimal fallback structure
            return [{
                name: 'Unable to parse tech stack',
                category: 'Error',
                detected: false,
                error: 'Failed to parse AI response'
            }];
        }
    }

    /**
     * Create or update prospect in database
     */
    private static async createOrUpdateProspect(
        existingProspect: any,
        profileData: LinkedInProfileData,
        linkedinUrl: string,
        email: string,
        aiSummary: string
    ) {
        const prospectData = {
            name: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
            email: email,
            company: profileData.experiences?.[0]?.company || null,
            position: profileData.headline || profileData.experiences?.[0]?.title || null,
            linkedinUrl: linkedinUrl,
            status: 'ENRICHED' as const,
            campaignId: 1, // Default campaign ID - you may want to make this configurable
            additionalData: {
                location: [profileData.city, profileData.state, profileData.country].filter(Boolean).join(', '),
                experience_count: profileData.experiences?.length || 0,
                education_count: profileData.education?.length || 0,
                languages: profileData.languages || [],
                certifications_count: profileData.certifications?.length || 0
            }
        }

        let prospect

        if (existingProspect) {
            // Update existing prospect
            prospect = await prisma.prospect.update({
                where: { id: existingProspect.id },
                data: prospectData
            })
        } else {
            // Create new prospect
            prospect = await prisma.prospect.create({
                data: prospectData
            })
        }

        // Create or update enrichment data
        await prisma.prospectEnrichment.upsert({
            where: { prospectId: prospect.id },
            create: {
                prospectId: prospect.id,
                linkedinSummary: aiSummary,
                enrichmentStatus: 'COMPLETED',
                modelUsed: 'proxycurl',
                enrichedAt: new Date()
            },
            update: {
                linkedinSummary: aiSummary,
                enrichmentStatus: 'COMPLETED',
                modelUsed: 'proxycurl',
                enrichedAt: new Date()
            }
        })

        return prospect
    }

    /**
     * Generate comprehensive prospect analysis using data from all 3 previous enrichments
     * Part 4: Prospect Analysis (LinkedIn + Company + Tech Stack)
     */
    static async enrichWithProspectAnalysis(prospectId: number, options: EnrichmentOptions = {}): Promise<EnrichmentResponse> {
        try {
            console.log(`🧠 [ProspectEnricher]: Starting prospect analysis for prospect ID ${prospectId}`)

            // Step 1: Get prospect and check if prospect analysis already exists
            const existingProspect = await prisma.cOProspects.findUnique({
                where: { id: prospectId },
                include: {
                    enrichment: true
                }
            })

            if (!existingProspect) {
                throw new Error(`Prospect with ID ${prospectId} not found`)
            }

            // Check if prospect analysis summary already exists
            if (existingProspect.enrichment?.prospectAnalysisSummary) {
                console.log(`✅ [ProspectEnricher]: Prospect analysis already exists for prospect ${prospectId}`)
                return {
                    success: true,
                    prospect: {
                        id: existingProspect.id,
                        email: existingProspect.email || '',
                        name: existingProspect.name || '',
                        linkedinUrl: existingProspect.linkedinUrl || '',
                        prospectAnalysisSummary: existingProspect.enrichment.prospectAnalysisSummary
                    },
                    message: 'Prospect analysis already exists for this prospect',
                    skipped: true
                }
            }

            // Step 2: Gather data from all 3 previous enrichments
            const enrichmentData = existingProspect.enrichment
            if (!enrichmentData) {
                throw new Error('No enrichment data found. Please run LinkedIn, Company, and Tech Stack enrichments first.')
            }

            // Check if we have at least some enrichment data
            const hasLinkedInData = !!enrichmentData.linkedinSummary
            const hasCompanyData = !!enrichmentData.companySummary
            const hasTechStackData = !!enrichmentData.techStack && Array.isArray(enrichmentData.techStack) && enrichmentData.techStack.length > 0

            if (!hasLinkedInData && !hasCompanyData && !hasTechStackData) {
                throw new Error('No enrichment data available. Please run LinkedIn, Company, and/or Tech Stack enrichments first.')
            }

            console.log(`📊 [ProspectEnricher]: Available enrichment data:`)
            console.log(`   - LinkedIn: ${hasLinkedInData ? '✅' : '❌'}`)
            console.log(`   - Company: ${hasCompanyData ? '✅' : '❌'}`)
            console.log(`   - Tech Stack: ${hasTechStackData ? '✅' : '❌'}`)

            // Step 3: Prepare combined data for AI analysis
            const combinedData = this.prepareCombinedEnrichmentData(existingProspect, enrichmentData)

            // Step 4: Generate AI prospect analysis using database prompt
            const aiProvider = options.aiProvider || 'openrouter'
            const prospectAnalysis = await this.generateProspectAnalysisWithAI(combinedData, aiProvider, options.llmModelId)

            // Step 5: Update prospect enrichment with analysis data
            await prisma.cOProspectEnrichments.update({
                where: { prospectId: existingProspect.id },
                data: {
                    prospectAnalysisSummary: prospectAnalysis,
                    enrichmentStatus: 'COMPLETED',
                    modelUsed: aiProvider,
                    enrichedAt: new Date()
                }
            })

            console.log(`✅ [ProspectEnricher]: Successfully generated prospect analysis for prospect ID ${prospectId}`)

            return {
                success: true,
                prospect: {
                    id: existingProspect.id,
                    email: existingProspect.email || '',
                    name: existingProspect.name || '',
                    linkedinUrl: existingProspect.linkedinUrl || '',
                    prospectAnalysisSummary: prospectAnalysis
                },
                message: 'Prospect analysis completed successfully',
                data: {
                    profileData: null as any, // Not applicable for prospect analysis
                    aiSummary: prospectAnalysis,
                    aiProvider: aiProvider
                }
            }

        } catch (error) {
            console.error(`❌ [ProspectEnricher]: Prospect analysis failed for prospect ID ${prospectId}:`, error)
            return {
                success: false,
                prospect: {
                    id: prospectId,
                    email: '',
                    name: '',
                    linkedinUrl: ''
                },
                message: `Prospect analysis failed: ${error instanceof Error ? error.message : String(error)}`
            }
        }
    }

    /**
     * Prepare combined enrichment data for AI analysis
     */
    private static prepareCombinedEnrichmentData(prospect: any, enrichmentData: any): string {
        const sections: string[] = []

        // Prospect basic information
        sections.push('=== PROSPECT BASIC INFORMATION ===')
        if (prospect.name) sections.push(`Name: ${prospect.name}`)
        if (prospect.email) sections.push(`Email: ${prospect.email}`)
        if (prospect.company) sections.push(`Company: ${prospect.company}`)
        if (prospect.position) sections.push(`Position: ${prospect.position}`)
        if (prospect.linkedinUrl) sections.push(`LinkedIn: ${prospect.linkedinUrl}`)

        // LinkedIn Summary
        if (enrichmentData.linkedinSummary) {
            sections.push('\n=== LINKEDIN PROFILE ANALYSIS ===')
            sections.push(enrichmentData.linkedinSummary)
        }

        // Company Summary
        if (enrichmentData.companySummary) {
            sections.push('\n=== COMPANY ANALYSIS ===')
            sections.push(enrichmentData.companySummary)
        }

        // Tech Stack Analysis
        if (enrichmentData.techStack && Array.isArray(enrichmentData.techStack)) {
            sections.push('\n=== TECHNOLOGY STACK ===')

            // Group technologies by category
            const techByCategory: { [key: string]: string[] } = {}
            enrichmentData.techStack.forEach((tech: any) => {
                if (tech.name && tech.category) {
                    if (!techByCategory[tech.category]) {
                        techByCategory[tech.category] = []
                    }
                    techByCategory[tech.category]!.push(tech.name)
                }
            })

            // Format tech stack by category
            Object.entries(techByCategory).forEach(([category, technologies]) => {
                sections.push(`${category}: ${technologies.join(', ')}`)
            })
        }

        return sections.join('\n')
    }

    /**
     * Generate prospect analysis using AI with database prompt
     */
    private static async generateProspectAnalysisWithAI(combinedData: string, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        try {
            // Get prospect analysis prompt from database
            const prompt = await ApiConfigurationService.getPrompt('prospect_analysis_prompt')

            // Replace placeholder with combined enrichment data
            const finalPrompt = prompt.replace('${COMBINED_ENRICHMENT_DATA}', combinedData)

            // Generate AI analysis
            const aiResponse = await this.generateProspectAnalysis(finalPrompt, aiProvider, llmModelId)

            console.log(`✅ [ProspectEnricher]: Generated prospect analysis using ${aiProvider}${llmModelId ? ` (${llmModelId})` : ''} with database prompt`)
            return aiResponse

        } catch (error) {
            console.error(`❌ [ProspectEnricher]: Failed to generate prospect analysis with AI:`, error)
            throw new Error(`Prospect analysis failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate prospect analysis using AI
     */
    private static async generateProspectAnalysis(prompt: string, aiProvider: 'gemini' | 'openrouter', llmModelId?: string): Promise<string> {
        try {
            if (aiProvider === 'gemini') {
                return await this.generateProspectAnalysisWithGemini(prompt)
            } else {
                return await this.generateProspectAnalysisWithOpenRouter(prompt, llmModelId)
            }
        } catch (error) {
            console.error(`❌ [ProspectEnricher]: Failed to generate prospect analysis with ${aiProvider}:`, error)
            throw new Error(`Prospect analysis failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate prospect analysis using Google Gemini
     */
    private static async generateProspectAnalysisWithGemini(prompt: string): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')

            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1000,
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!aiResponse) {
                throw new Error('No prospect analysis returned from Gemini API')
            }

            console.log(`✅ [ProspectEnricher]: Generated prospect analysis with Gemini using database prompt`)
            return aiResponse

        } catch (error) {
            console.error('Failed to generate prospect analysis with Gemini:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate prospect analysis using OpenRouter with retry logic and model selection
     */
    private static async generateProspectAnalysisWithOpenRouter(prompt: string, llmModelId?: string): Promise<string> {
        const maxRetries = 3
        let lastError: Error | null = null

        // Determine the model to use based on llmModelId
        let modelId: string = 'openai/o1-mini';
        let modelName: string = 'o1-mini';
        let requestBody: any = {};

        if (llmModelId) {
            switch (llmModelId) {
                case 'openrouter-o1-mini':
                    modelId = 'openai/o1-mini';
                    modelName = 'o1-mini';
                    // o1-mini doesn't support temperature
                    requestBody = {
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: 3000,
                    };
                    break;

                case 'openrouter-gemini-2.5-pro':
                    modelId = 'google/gemini-2.5-pro';
                    modelName = 'gemini-2.5-pro';
                    // Gemini models support temperature
                    requestBody = {
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: 3000,
                        temperature: 0.7,
                    };
                    break;

                case 'openrouter-gemini-2.5-flash':
                    modelId = 'google/gemini-2.0-flash-001';
                    modelName = 'gemini-2.0-flash-001';
                    // Gemini models support temperature
                    requestBody = {
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: 3000,
                        temperature: 0.7,
                    };
                    break;

                default:
                    console.log(`⚠️ [ProspectEnricher]: Unknown specific model '${llmModelId}', defaulting to o1-mini`);
                    modelId = 'openai/o1-mini';
                    modelName = 'o1-mini-default';
                    requestBody = {
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: 3000,
                    };
                    break;
            }
        } else {
            // Default behavior (backwards compatibility)
            requestBody = {
                model: modelId,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 3000,
            };
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')

                console.log(`🔗 [ProspectEnricher]: Making OpenRouter API call for prospect analysis with ${modelName} (attempt ${attempt}/${maxRetries})...`)

                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions',
                    requestBody,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 120 seconds - prospect analysis is the most complex task
                    }
                )

                console.log(`🔍 [ProspectEnricher]: OpenRouter ${modelName} prospect analysis response status:`, response.status)
                console.log(`🔍 [ProspectEnricher]: OpenRouter ${modelName} prospect analysis response choices length:`, response.data?.choices?.length || 0)

                const aiResponse = response.data.choices[0]?.message?.content?.trim()
                if (!aiResponse) {
                    console.error(`❌ [ProspectEnricher]: OpenRouter ${modelName} returned empty prospect analysis response:`, JSON.stringify(response.data, null, 2))
                    throw new Error(`No prospect analysis returned from OpenRouter ${modelName} API`)
                }

                console.log(`✅ [ProspectEnricher]: Generated prospect analysis with OpenRouter ${modelName} using database prompt`)
                return aiResponse
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                console.error(`❌ [ProspectEnricher]: Prospect analysis attempt ${attempt} with ${modelName} failed:`, lastError.message)

                if (axios.isAxiosError(error) && error.response) {
                    console.error(`❌ [ProspectEnricher]: OpenRouter ${modelName} prospect analysis API error details:`, {
                        status: error.response.status,
                        statusText: error.response.statusText,
                        data: error.response.data
                    })

                    // Don't retry on certain errors
                    if (error.response.status === 401 || error.response.status === 403) {
                        throw new Error(`OpenRouter API authentication error: ${error.response.status}`)
                    }
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
                    console.log(`⏳ [ProspectEnricher]: Waiting ${delay}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        throw new Error(`OpenRouter ${modelName} prospect analysis API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
    }
} 