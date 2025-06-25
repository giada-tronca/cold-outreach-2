import axios from 'axios'
import { ApiConfigurationService } from './apiConfigurationService'
import { AppError } from '@/utils/errors'

// Updated interfaces to match Firecrawl V1 API documentation
interface FirecrawlCrawlStatusResponse {
    success: boolean
    status: 'scraping' | 'completed' | 'failed'
    current?: number
    total?: number
    data?: Array<{
        content?: string
        markdown: string
        html?: string
        rawHtml?: string
        screenshot?: string
        links?: string[]
        metadata: {
            title: string
            description: string
            language: string
            sourceURL: string
            statusCode: number
            error?: string
        }
        llm_extraction?: any
        warning?: string
    }>
    error?: string
}

// Updated to match V1 API response format
interface FirecrawlScrapeResponse {
    success: boolean
    data?: {
        content?: string
        markdown: string
        html?: string
        rawHtml?: string
        screenshot?: string
        links?: string[]
        metadata: {
            title: string
            description: string
            language: string
            sourceURL: string
            statusCode: number
            error?: string
        }
        llm_extraction?: any
        extract?: any
        warning?: string
    }
    error?: string
}

export interface CompanyWebsiteData {
    url: string
    title?: string
    description?: string
    content?: string
    markdown?: string
    businessInfo?: {
        industry?: string
        products?: string[]
        services?: string[]
        keyPeople?: string[]
        recentNews?: string[]
        contactInfo?: {
            email?: string
            phone?: string
            address?: string
        }
    }
    socialMedia?: {
        linkedin?: string
        twitter?: string
        facebook?: string
        instagram?: string
    }
    metadata?: {
        language?: string
        statusCode?: number
        scrapedAt?: string
    }
    rawData?: FirecrawlScrapeResponse['data']
}

/**
 * Firecrawl API Service for V1 API
 * Handles website content scraping and crawling according to official documentation
 */
export class FirecrawlService {

    /**
     * Create axios instance with authentication
     */
    private static async createAxiosInstance(): Promise<any> {
        const apiKey = await ApiConfigurationService.getApiKey('firecrawlApiKey')
        const config = await ApiConfigurationService.getModelConfiguration()

        return axios.create({
            baseURL: 'https://api.firecrawl.dev',
            timeout: Math.max(config.timeout || 60000, 60000), // Ensure at least 60 seconds for Firecrawl
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        })
    }

    /**
     * Retry request with exponential backoff
     */
    private static async retryRequest<T>(
        requestFn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn()
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))

                if (attempt === maxRetries) {
                    break
                }

                // Exponential backoff
                const delay = baseDelay * Math.pow(2, attempt - 1)
                console.log(`⏳ [Firecrawl]: Attempt ${attempt} failed, retrying in ${delay}ms...`)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }

        throw lastError
    }

    /**
     * Extract company website URL from email domain
     * This is the primary method to get company website URL
     */
    static extractCompanyWebsiteFromEmail(email: string): string | null {
        try {
            if (!email || !email.includes('@')) {
                return null
            }

            const emailDomain = email.split('@')[1]?.toLowerCase()
            if (!emailDomain) {
                return null
            }

            // Skip common free email providers
            const freeEmailProviders = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
                'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
                'mail.com', 'yandex.com', 'zoho.com', 'mailinator.com',
                'tempmail.org', '10minutemail.com'
            ]

            if (freeEmailProviders.includes(emailDomain)) {
                return null
            }

            // Use the email domain as the company website
            const websiteUrl = `https://www.${emailDomain}`
            console.log(`🔍 [Firecrawl]: Extracted company website from email domain: ${websiteUrl}`)
            return websiteUrl

        } catch (error) {
            console.error(`❌ [Firecrawl]: Failed to extract website from email ${email}:`, error)
            return null
        }
    }

    /**
     * Scrape website content using V1 API
     * Based on official documentation: https://docs.firecrawl.dev/api-reference/endpoint/scrape
     */
    static async scrapeCompanyWebsite(url: string): Promise<CompanyWebsiteData> {
        try {
            console.log(`🔍 [Firecrawl]: Scraping website: ${url}`)

            const axiosInstance = await this.createAxiosInstance()
            const config = await ApiConfigurationService.getModelConfiguration()

            // V1 API payload according to official documentation
            const scrapePayload = {
                url: url,
                formats: ['markdown'], // V1 API uses 'formats' array
                onlyMainContent: true,
                includeTags: [], // Optional: specify HTML tags to include
                excludeTags: ['script', 'style', 'nav', 'footer'], // Exclude non-content elements
                timeout: 30000,
                waitFor: 0, // Wait time in milliseconds before scraping
                mobile: false, // Use desktop user agent
                skipTlsVerification: false,
                removeBase64Images: true, // Remove base64 images to reduce response size
                blockAds: true // Block ads for cleaner content
            }

            console.log(`🔍 [Firecrawl]: Making API request with ${config.retryAttempts || 3} retry attempts`)

            const response = await this.retryRequest(
                () => axiosInstance.post('/v1/scrape', scrapePayload),
                config.retryAttempts || 3
            ) as any

            const data = response.data as FirecrawlScrapeResponse

            if (!data.success) {
                throw new Error(data.error || 'Scraping failed')
            }

            const scrapedData = data.data

            if (!scrapedData) {
                throw new Error('No data returned from Firecrawl API')
            }

            // Extract and structure the company information
            const websiteData: CompanyWebsiteData = {
                url: url,
                title: scrapedData.metadata?.title || '',
                description: scrapedData.metadata?.description || '',
                content: scrapedData.content || '',
                markdown: scrapedData.markdown || '',
                businessInfo: this.extractBusinessInfo(scrapedData.content || scrapedData.markdown || ''),
                socialMedia: this.extractSocialMedia(scrapedData.content || scrapedData.markdown || ''),
                metadata: {
                    language: scrapedData.metadata?.language || 'en',
                    statusCode: scrapedData.metadata?.statusCode || 200,
                    scrapedAt: new Date().toISOString()
                },
                rawData: scrapedData
            }

            console.log(`✅ [Firecrawl]: Successfully scraped website: ${url}`)
            return websiteData

        } catch (error) {
            console.error(`❌ [Firecrawl]: Failed to scrape website ${url}:`, error)

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status
                const message = error.response.data?.error || error.message

                // Handle specific error codes
                if (status === 402) {
                    throw new AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan.`)
                } else if (status === 429) {
                    throw new AppError(`Firecrawl rate limit exceeded: ${message}. Please try again later.`)
                }

                throw new AppError(`Firecrawl API error (${status}): ${message}`)
            }

            throw new AppError(`Firecrawl scraping failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Extract structured data from a website using LLM extraction
     * Based on V1 API with jsonOptions for structured extraction
     */
    static async extractCompanyData(url: string, extractionPrompt?: string): Promise<any> {
        try {
            console.log(`🔍 [Firecrawl]: Extracting structured data from: ${url}`)

            const axiosInstance = await this.createAxiosInstance()
            const config = await ApiConfigurationService.getModelConfiguration()

            // Default extraction schema for company data
            const defaultSchema = {
                type: "object",
                properties: {
                    company_name: {
                        type: "string",
                        description: "The name of the company"
                    },
                    description: {
                        type: "string",
                        description: "Brief description of what the company does"
                    },
                    industry: {
                        type: "string",
                        description: "The industry or sector the company operates in"
                    },
                    services: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of services offered by the company"
                    },
                    products: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of products offered by the company"
                    },
                    key_people: {
                        type: "array",
                        items: { type: "string" },
                        description: "Names of key executives or team members"
                    },
                    contact_info: {
                        type: "object",
                        properties: {
                            email: { type: "string", description: "Contact email address" },
                            phone: { type: "string", description: "Contact phone number" },
                            address: { type: "string", description: "Physical address" }
                        }
                    },
                    founded_year: {
                        type: "string",
                        description: "Year the company was founded"
                    },
                    company_size: {
                        type: "string",
                        description: "Size of the company (employees, revenue, etc.)"
                    }
                },
                required: ["company_name", "description"]
            }

            // V1 API payload with JSON extraction
            const extractPayload = {
                url: url,
                formats: ['extract'],
                onlyMainContent: true,
                timeout: 30000,
                extract: {
                    schema: defaultSchema,
                    systemPrompt: "You are an expert at extracting company information from websites. Extract accurate and relevant information only.",
                    prompt: extractionPrompt || "Extract comprehensive company information from this website including company name, description, industry, services, products, key people, and contact information."
                },
                removeBase64Images: true,
                blockAds: true
            }

            const response = await this.retryRequest(
                () => axiosInstance.post('/v1/scrape', extractPayload),
                config.retryAttempts || 3
            ) as any

            const data = response.data as FirecrawlScrapeResponse

            if (!data.success) {
                throw new Error(data.error || 'Extraction failed')
            }

            console.log(`✅ [Firecrawl]: Successfully extracted structured data from: ${url}`)
            return data.data?.extract || data.data?.llm_extraction || {}

        } catch (error) {
            console.error(`❌ [Firecrawl]: Failed to extract data from ${url}:`, error)

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status
                const message = error.response.data?.error || error.message
                throw new AppError(`Firecrawl extraction error (${status}): ${message}`)
            }

            throw new AppError(`Firecrawl extraction failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Start a crawl job using V1 API
     * Based on official documentation: https://docs.firecrawl.dev/api-reference/endpoint/crawl-post
     */
    static async startCrawlJob(url: string, options: {
        maxPages?: number
        allowBackwardLinks?: boolean
        allowExternalLinks?: boolean
        maxDepth?: number
        excludePaths?: string[]
        includePaths?: string[]
    } = {}): Promise<{ jobId: string; statusUrl: string }> {
        try {
            console.log(`🚀 [Firecrawl]: Starting crawl job for: ${url}`)

            const axiosInstance = await this.createAxiosInstance()

            // V1 API crawl payload according to official documentation
            const crawlPayload = {
                url: url,
                excludePaths: options.excludePaths || [
                    "/admin/*", "/login/*", "/auth/*", "/api/*"
                ],
                includePaths: options.includePaths || [],
                maxDepth: options.maxDepth || 3,
                ignoreSitemap: false,
                limit: options.maxPages || 10,
                allowBackwardLinks: options.allowBackwardLinks || false,
                allowExternalLinks: options.allowExternalLinks || false,
                scrapeOptions: {
                    formats: ['markdown'],
                    onlyMainContent: true,
                    excludeTags: ['script', 'style', 'nav', 'footer', 'header'],
                    timeout: 30000,
                    waitFor: 0,
                    mobile: false,
                    skipTlsVerification: false,
                    removeBase64Images: true,
                    blockAds: true
                }
            }

            const response = await axiosInstance.post('/v1/crawl', crawlPayload)

            if (!response.data?.success) {
                throw new Error(response.data?.error || 'Failed to start crawl job')
            }

            const jobId = response.data.id
            const statusUrl = response.data.url

            console.log(`✅ [Firecrawl]: Crawl job started with ID: ${jobId}`)

            return {
                jobId,
                statusUrl
            }

        } catch (error) {
            console.error(`❌ [Firecrawl]: Failed to start crawl job for ${url}:`, error)

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status
                const message = error.response.data?.error || error.message

                // Handle payment/billing errors specifically
                if (status === 402) {
                    console.log(`💳 [Firecrawl]: Payment required - please upgrade your Firecrawl plan`)
                    throw new AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan.`)
                } else if (status === 429) {
                    throw new AppError(`Firecrawl rate limit exceeded: ${message}. Please try again later.`)
                }

                throw new AppError(`Firecrawl crawl start error (${status}): ${message}`)
            }

            throw new AppError(`Firecrawl crawl job failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Poll crawl job status until completion using V1 API
     */
    static async pollCrawlStatus(jobId: string, maxWaitTime: number = 300000): Promise<FirecrawlCrawlStatusResponse> {
        try {
            console.log(`🔍 [Firecrawl]: Polling crawl status for job: ${jobId}`)

            const axiosInstance = await this.createAxiosInstance()
            const startTime = Date.now()
            const pollInterval = 3000 // 3 seconds

            while (Date.now() - startTime < maxWaitTime) {
                const response = await axiosInstance.get(`/v1/crawl/${jobId}`)
                const status = response.data

                console.log(`🔍 [Firecrawl]: Crawl status: ${status.status} (${status.current || 0}/${status.total || 0})`)

                if (status.status === 'completed') {
                    console.log(`✅ [Firecrawl]: Crawl job completed successfully: ${jobId}`)
                    return status
                }

                if (status.status === 'failed') {
                    throw new Error(status.error || 'Crawl job failed')
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval))
            }

            throw new Error(`Crawl job timeout after ${maxWaitTime}ms`)

        } catch (error) {
            console.error(`❌ [Firecrawl]: Failed to poll crawl status for ${jobId}:`, error)

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status
                const message = error.response.data?.error || error.message

                // Handle payment/billing errors specifically
                if (status === 402) {
                    console.log(`💳 [Firecrawl]: Payment required - please upgrade your Firecrawl plan`)
                    throw new AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan.`)
                }

                throw new AppError(`Firecrawl crawl status error (${status}): ${message}`)
            }

            throw new AppError(`Firecrawl crawl polling failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Crawl website and generate AI company summary using database prompt
     * This method combines crawling multiple pages with AI analysis
     */
    static async crawlAndGenerateCompanySummary(url: string, aiProvider: 'gemini' | 'openrouter' = 'openrouter'): Promise<{
        companySummary: string
        websiteData: CompanyWebsiteData
        crawlData: {
            totalPages: number
            pagesContent: string[]
        }
    }> {
        try {
            console.log(`🔍 [Firecrawl]: Starting comprehensive crawl and summary for: ${url}`)

            // Start crawl job with optimized settings
            const { jobId } = await this.startCrawlJob(url, {
                maxPages: 10,
                maxDepth: 2,
                allowBackwardLinks: false,
                allowExternalLinks: false,
                excludePaths: [
                    "/admin/*", "/login/*", "/auth/*", "/api/*", "/wp-admin/*",
                    "/privacy*", "/terms*", "/cookie*", "/legal*"
                ]
            })

            // Poll for completion
            const crawlResult = await this.pollCrawlStatus(jobId)

            if (crawlResult.status !== 'completed' || !crawlResult.data) {
                throw new Error('Crawl job did not complete successfully')
            }

            // Extract content from all pages
            const pagesContent = crawlResult.data.map(page => page.markdown || page.content || '')

            // Format content as requested: home page: content, pg1: content, pg2: content, etc.
            const formattedContent = this.formatMultiPageContent(crawlResult.data)

            // Get basic website data from home page
            const websiteData = await this.scrapeCompanyWebsite(url)

            // Generate AI summary using database prompt
            const companySummary = await this.generateCompanySummaryFromMultiPageContent(formattedContent, aiProvider)

            console.log(`✅ [Firecrawl]: Successfully completed crawl and summary for: ${url} (${crawlResult.data.length} pages)`)

            return {
                companySummary,
                websiteData,
                crawlData: {
                    totalPages: crawlResult.data.length,
                    pagesContent
                }
            }

        } catch (error) {
            console.error(`❌ [Firecrawl]: Failed to crawl and generate summary for ${url}:`, error)
            throw error
        }
    }

    /**
     * Format multi-page content in the requested format:
     * home page: content, pg1: content, pg2: content, etc.
     */
    private static formatMultiPageContent(pages: Array<{
        content?: string
        markdown: string
        html?: string
        metadata: {
            title: string
            description: string
            language: string
            sourceURL: string
            statusCode: number
        }
    }>): string {
        const formattedPages: string[] = []

        pages.forEach((page, index) => {
            // Prioritize markdown field for v1 API
            const content = page.markdown || page.content || ''
            const url = page.metadata?.sourceURL || ''

            if (index === 0) {
                // First page is the home page
                formattedPages.push(`home page (${url}): ${content}`)
            } else {
                // Subsequent pages are pg1, pg2, etc.
                formattedPages.push(`pg${index} (${url}): ${content}`)
            }
        })

        return formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n')
    }

    /**
     * Generate company summary from multi-page content using database prompt
     */
    static async generateCompanySummaryFromMultiPageContent(multiPageContent: string, aiProvider: 'gemini' | 'openrouter' = 'openrouter'): Promise<string> {
        try {
            // Get company summary prompt from database
            const prompt = await ApiConfigurationService.getPrompt('company_summary_prompt')

            // Replace placeholder with the multi-page content
            const finalPrompt = prompt.replace('${WEBSITE_CONTENT}', multiPageContent)

            console.log(`🤖 [Firecrawl]: Generating company summary using ${aiProvider} with ${multiPageContent.length} characters of content`)

            return await this.generateAISummary(finalPrompt, aiProvider)
        } catch (error) {
            console.error('❌ [Firecrawl]: Failed to generate company summary from multi-page content:', error)
            return 'Unable to generate company summary from website content.'
        }
    }

    /**
     * Generate AI summary using specified provider
     */
    private static async generateAISummary(prompt: string, aiProvider: 'gemini' | 'openrouter'): Promise<string> {
        switch (aiProvider) {
            case 'gemini':
                return await this.generateSummaryWithGemini(prompt)
            case 'openrouter':
                return await this.generateSummaryWithOpenRouter(prompt)
            default:
                throw new Error(`Unsupported AI provider: ${aiProvider}`)
        }
    }

    /**
     * Generate summary using Google Gemini
     */
    private static async generateSummaryWithGemini(prompt: string): Promise<string> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1000,
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            )

            return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary generation failed'

        } catch (error) {
            console.error('❌ [Firecrawl]: Gemini API error:', error)
            throw new AppError(`Gemini summary generation failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate summary using OpenRouter o1-mini with retry logic
     */
    private static async generateSummaryWithOpenRouter(prompt: string): Promise<string> {
        const maxRetries = 3
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')

                console.log(`🔗 [Firecrawl]: Making OpenRouter API call (attempt ${attempt}/${maxRetries})...`)
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'openai/o1-mini',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_completion_tokens: 8000
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                })

                console.log('🔍 [Firecrawl]: OpenRouter response status:', response.status)
                console.log('🔍 [Firecrawl]: OpenRouter response choices length:', response.data?.choices?.length || 0)

                const aiSummary = response.data.choices[0]?.message?.content?.trim()
                if (!aiSummary) {
                    console.error('❌ [Firecrawl]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2))
                    throw new Error('No AI summary returned from OpenRouter API')
                }

                console.log('✅ [Firecrawl]: Successfully generated summary with OpenRouter')
                return aiSummary
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                console.error(`❌ [Firecrawl]: Attempt ${attempt} failed:`, lastError.message)

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
                    console.log(`⏳ [Firecrawl]: Waiting ${delay}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        throw new Error(`OpenRouter API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
    }

    /**
     * Extract business information from content using improved parsing
     */
    private static extractBusinessInfo(content: string): CompanyWebsiteData['businessInfo'] {
        const lines = content.toLowerCase()

        const businessInfo: CompanyWebsiteData['businessInfo'] = {
            industry: '',
            products: [],
            services: [],
            keyPeople: [],
            recentNews: [],
            contactInfo: {}
        }

        // Enhanced industry detection
        const industryKeywords = {
            'Technology': ['technology', 'software', 'tech', 'ai', 'artificial intelligence', 'machine learning', 'saas', 'platform'],
            'Healthcare': ['healthcare', 'medical', 'health', 'pharma', 'pharmaceutical', 'biotech', 'clinical'],
            'Finance': ['finance', 'financial', 'fintech', 'banking', 'investment', 'trading', 'crypto'],
            'E-commerce': ['ecommerce', 'e-commerce', 'retail', 'shopping', 'marketplace', 'store'],
            'Education': ['education', 'learning', 'training', 'course', 'university', 'school'],
            'Marketing': ['marketing', 'advertising', 'digital marketing', 'seo', 'social media'],
            'Consulting': ['consulting', 'advisory', 'strategy', 'management consulting']
        }

        for (const [industry, keywords] of Object.entries(industryKeywords)) {
            if (keywords.some(keyword => lines.includes(keyword))) {
                businessInfo.industry = industry
                break
            }
        }

        // Extract contact information with improved regex
        const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
        if (emailMatch && emailMatch[0]) {
            businessInfo.contactInfo!.email = emailMatch[0]
        }

        const phoneMatch = content.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g)
        if (phoneMatch && phoneMatch[0]) {
            businessInfo.contactInfo!.phone = phoneMatch[0].trim()
        }

        // Extract products and services
        const productKeywords = ['product', 'solution', 'offering', 'tool']
        const serviceKeywords = ['service', 'consulting', 'support', 'management']

        businessInfo.products = this.extractListItems(content, productKeywords)
        businessInfo.services = this.extractListItems(content, serviceKeywords)

        return businessInfo
    }

    /**
     * Extract social media links from content with improved regex
     */
    private static extractSocialMedia(content: string): CompanyWebsiteData['socialMedia'] {
        const socialMedia: CompanyWebsiteData['socialMedia'] = {}

        // LinkedIn
        const linkedinMatch = content.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[^\s"'<>]+/i)
        if (linkedinMatch) {
            socialMedia.linkedin = linkedinMatch[0]
        }

        // Twitter/X
        const twitterMatch = content.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"'<>]+/i)
        if (twitterMatch) {
            socialMedia.twitter = twitterMatch[0]
        }

        // Facebook
        const facebookMatch = content.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i)
        if (facebookMatch) {
            socialMedia.facebook = facebookMatch[0]
        }

        // Instagram
        const instagramMatch = content.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i)
        if (instagramMatch) {
            socialMedia.instagram = instagramMatch[0]
        }

        return socialMedia
    }

    /**
     * Helper method to extract list items from content
     */
    private static extractListItems(content: string, keywords: string[]): string[] {
        const items: string[] = []

        for (const keyword of keywords) {
            const regex = new RegExp(`${keyword}s?[:\\-]?\\s*([^\\n]{1,100})`, 'gi')
            const matches = content.matchAll(regex)

            for (const match of matches) {
                if (match[1]) {
                    const item = match[1].trim().replace(/[^\w\s-]/g, '').trim()
                    if (item.length > 3 && !items.includes(item)) {
                        items.push(item)
                    }
                }
            }
        }

        return items.slice(0, 5) // Limit to 5 items
    }
} 