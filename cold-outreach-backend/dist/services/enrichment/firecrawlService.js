"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirecrawlService = void 0;
const axios_1 = __importDefault(require("axios"));
const apiConfigurationService_1 = require("./apiConfigurationService");
const errors_1 = require("@/utils/errors");
const emailHelpers_1 = require("@/utils/emailHelpers");
const templateHelpers_1 = require("@/utils/templateHelpers");
/**
 * Firecrawl API Service for V1 API
 * Handles website content scraping and crawling according to official documentation
 */
class FirecrawlService {
    /**
     * Create axios instance with authentication
     */
    static async createAxiosInstance() {
        const apiKey = await apiConfigurationService_1.ApiConfigurationService.getApiKey('firecrawlApiKey');
        const config = await apiConfigurationService_1.ApiConfigurationService.getModelConfiguration();
        return axios_1.default.create({
            baseURL: 'https://api.firecrawl.dev',
            timeout: Math.max(config.timeout || 60000, 60000), // Ensure at least 60 seconds for Firecrawl
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }
    /**
     * Retry request with exponential backoff
     */
    static async retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt === maxRetries) {
                    break;
                }
                // Exponential backoff
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`⏳ [Firecrawl]: Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
    /**
     * Extract company website URL from email
     * This is the primary method to get company website URL
     */
    static extractCompanyWebsiteFromEmail(email) {
        const websiteUrl = (0, emailHelpers_1.extractCompanyWebsiteFromEmail)(email);
        if (websiteUrl) {
            console.log(`🔍 [Firecrawl]: Extracted company website from email domain: ${websiteUrl}`);
        }
        return websiteUrl;
    }
    /**
     * Scrape website content using V1 API
     * Based on official documentation: https://docs.firecrawl.dev/api-reference/endpoint/scrape
     */
    static async scrapeCompanyWebsite(url) {
        try {
            console.log(`🔍 [Firecrawl]: Scraping website: ${url}`);
            const axiosInstance = await this.createAxiosInstance();
            const config = await apiConfigurationService_1.ApiConfigurationService.getModelConfiguration();
            // V1 API payload with optimized configuration for clean markdown content
            const scrapePayload = {
                url: url,
                formats: ["markdown"], // Only request markdown format
                onlyMainContent: true, // Extract only main content, no headers/footers/navigation
                maxAge: 3600000, // Cache for 1 hour (3600000ms)
                mobile: false, // Use desktop user agent for better content
                storeInCache: true // Store in Firecrawl cache for faster subsequent requests
            };
            console.log(`🔍 [Firecrawl]: Making API request with ${config.retryAttempts || 3} retry attempts`);
            const response = await this.retryRequest(() => axiosInstance.post('/v1/scrape', scrapePayload), config.retryAttempts || 3);
            const data = response.data;
            if (!data.success) {
                throw new Error(data.error || 'Scraping failed');
            }
            const scrapedData = data.data;
            if (!scrapedData) {
                throw new Error('No data returned from Firecrawl API');
            }
            // Extract and structure the company information
            const websiteData = {
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
            };
            console.log(`✅ [Firecrawl]: Successfully scraped website: ${url}`);
            return websiteData;
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to scrape website ${url}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const message = error.response.data?.error || error.message;
                // Handle specific error codes
                if (status === 402) {
                    throw new errors_1.AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan.`);
                }
                else if (status === 429) {
                    throw new errors_1.AppError(`Firecrawl rate limit exceeded: ${message}. Please try again later.`);
                }
                throw new errors_1.AppError(`Firecrawl API error (${status}): ${message}`);
            }
            throw new errors_1.AppError(`Firecrawl scraping failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Extract structured data from a website using LLM extraction
     * Based on V1 API with jsonOptions for structured extraction
     */
    static async extractCompanyData(url, extractionPrompt) {
        try {
            console.log(`🔍 [Firecrawl]: Extracting structured data from: ${url}`);
            const axiosInstance = await this.createAxiosInstance();
            const config = await apiConfigurationService_1.ApiConfigurationService.getModelConfiguration();
            // Default extraction schema for company data (currently disabled)
            // const defaultSchema = {
            //     type: "object",
            //     properties: {
            //         company_name: {
            //             type: "string",
            //             description: "The name of the company"
            //         },
            //         description: {
            //             type: "string",
            //             description: "Brief description of what the company does"
            //         },
            //         industry: {
            //             type: "string",
            //             description: "The industry or sector the company operates in"
            //         },
            //         services: {
            //             type: "array",
            //             items: { type: "string" },
            //             description: "List of services offered by the company"
            //         },
            //         products: {
            //             type: "array",
            //             items: { type: "string" },
            //             description: "List of products offered by the company"
            //         },
            //         key_people: {
            //             type: "array",
            //             items: { type: "string" },
            //             description: "Names of key executives or team members"
            //         },
            //         contact_info: {
            //             type: "object",
            //             properties: {
            //                 email: { type: "string", description: "Contact email address" },
            //                 phone: { type: "string", description: "Contact phone number" },
            //                 address: { type: "string", description: "Physical address" }
            //             }
            //         },
            //         founded_year: {
            //             type: "string",
            //             description: "Year the company was founded"
            //         },
            //         company_size: {
            //             type: "string",
            //             description: "Size of the company (employees, revenue, etc.)"
            //         }
            //     },
            //     required: ["company_name", "description"]
            // }
            // V1 API payload with JSON extraction
            const extractPayload = {
                url: url,
                formats: ['extract'],
                onlyMainContent: true,
                timeout: 30000,
                // extract: {
                //     schema: defaultSchema,
                //     systemPrompt: "You are an expert at extracting company information from websites. Extract accurate and relevant information only.",
                //     prompt: extractionPrompt || "Extract comprehensive company information from this website including company name, description, industry, services, products, key people, and contact information."
                // },
                removeBase64Images: true,
                blockAds: true
            };
            const response = await this.retryRequest(() => axiosInstance.post('/v1/scrape', extractPayload), config.retryAttempts || 3);
            const data = response.data;
            if (!data.success) {
                throw new Error(data.error || 'Extraction failed');
            }
            console.log(`✅ [Firecrawl]: Successfully extracted structured data from: ${url}`);
            return data.data?.extract || data.data?.llm_extraction || {};
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to extract data from ${url}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const message = error.response.data?.error || error.message;
                throw new errors_1.AppError(`Firecrawl extraction error (${status}): ${message}`);
            }
            throw new errors_1.AppError(`Firecrawl extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Start a crawl job using V1 API
     * Based on official documentation: https://docs.firecrawl.dev/api-reference/endpoint/crawl-post
     */
    static async startCrawlJob(url, options = {}) {
        try {
            console.log(`🚀 [Firecrawl]: Starting crawl job for: ${url}`);
            const axiosInstance = await this.createAxiosInstance();
            // V1 API crawl payload with optimized scrape options
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
                    formats: ["markdown"], // Only request markdown format
                    onlyMainContent: true, // Extract only main content
                    maxAge: 3600000, // Cache for 1 hour
                    mobile: false, // Use desktop user agent
                    storeInCache: true // Store in cache
                }
            };
            const response = await axiosInstance.post('/v1/crawl', crawlPayload);
            if (!response.data?.success) {
                throw new Error(response.data?.error || 'Failed to start crawl job');
            }
            const jobId = response.data.id;
            const statusUrl = response.data.url;
            console.log(`✅ [Firecrawl]: Crawl job started with ID: ${jobId}`);
            return {
                jobId,
                statusUrl
            };
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to start crawl job for ${url}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const message = error.response.data?.error || error.message;
                // Handle payment/billing errors specifically
                if (status === 402) {
                    console.log(`💳 [Firecrawl]: Payment required - please upgrade your Firecrawl plan`);
                    throw new errors_1.AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan.`);
                }
                else if (status === 429) {
                    throw new errors_1.AppError(`Firecrawl rate limit exceeded: ${message}. Please try again later.`);
                }
                throw new errors_1.AppError(`Firecrawl crawl start error (${status}): ${message}`);
            }
            throw new errors_1.AppError(`Firecrawl crawl job failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Poll crawl job status until completion using V1 API
     */
    static async pollCrawlStatus(jobId, maxWaitTime = 300000) {
        try {
            console.log(`🔍 [Firecrawl]: Polling crawl status for job: ${jobId}`);
            const axiosInstance = await this.createAxiosInstance();
            const startTime = Date.now();
            const pollInterval = 3000; // 3 seconds
            while (Date.now() - startTime < maxWaitTime) {
                const response = await axiosInstance.get(`/v1/crawl/${jobId}`);
                const status = response.data;
                console.log(`🔍 [Firecrawl]: Crawl status: ${status.status} (${status.current || 0}/${status.total || 0})`);
                if (status.status === 'completed') {
                    console.log(`✅ [Firecrawl]: Crawl job completed successfully: ${jobId}`);
                    return status;
                }
                if (status.status === 'failed') {
                    throw new Error(status.error || 'Crawl job failed');
                }
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            throw new Error(`Crawl job timeout after ${maxWaitTime}ms`);
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to poll crawl status for ${jobId}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const message = error.response.data?.error || error.message;
                // Handle payment/billing errors specifically
                if (status === 402) {
                    console.log(`💳 [Firecrawl]: Payment required - please upgrade your Firecrawl plan`);
                    throw new errors_1.AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan.`);
                }
                throw new errors_1.AppError(`Firecrawl crawl status error (${status}): ${message}`);
            }
            throw new errors_1.AppError(`Firecrawl crawl polling failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Crawl website and generate AI company summary using database prompt
     * This method combines crawling multiple pages with AI analysis
     */
    static async crawlAndGenerateCompanySummary(url, aiProvider = 'openrouter', llmModelId, pagesToScrape = 3) {
        try {
            console.log(`🔍 [Firecrawl]: Starting comprehensive crawl and summary for: ${url}`);
            // Start crawl job with user-specified page limit
            const { jobId } = await this.startCrawlJob(url, {
                maxPages: Math.min(pagesToScrape, 10), // Respect user setting but cap at 10
                maxDepth: 2,
                allowBackwardLinks: false,
                allowExternalLinks: false,
                excludePaths: [
                    "/admin/*", "/login/*", "/auth/*", "/api/*", "/wp-admin/*",
                    "/privacy*", "/terms*", "/cookie*", "/legal*"
                ]
            });
            // Poll for completion
            const crawlResult = await this.pollCrawlStatus(jobId);
            if (crawlResult.status !== 'completed' || !crawlResult.data) {
                throw new Error('Crawl job did not complete successfully');
            }
            // Extract content from all pages
            const pagesContent = crawlResult.data.map(page => page.markdown || page.content || '');
            // Format content as requested: home page: content, pg1: content, pg2: content, etc.
            const formattedContent = this.formatMultiPageContent(crawlResult.data);
            // Get basic website data from home page
            const websiteData = await this.scrapeCompanyWebsite(url);
            // Generate AI summary using database prompt
            const companySummary = await this.generateCompanySummaryFromMultiPageContent(formattedContent, aiProvider);
            console.log(`✅ [Firecrawl]: Successfully completed crawl and summary for: ${url} (${crawlResult.data.length} pages)`);
            return {
                companySummary,
                websiteData,
                crawlData: {
                    totalPages: crawlResult.data.length,
                    pagesContent
                }
            };
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to crawl and generate summary for ${url}:`, error);
            throw error;
        }
    }
    /**
     * Format multi-page content in the requested format:
     * home page: content, pg1: content, pg2: content, etc.
     */
    static formatMultiPageContent(pages) {
        const formattedPages = [];
        pages.forEach((page, index) => {
            // Prioritize markdown field for v1 API
            const content = page.markdown || page.content || '';
            const url = page.metadata?.sourceURL || '';
            if (index === 0) {
                // First page is the home page
                formattedPages.push(`home page (${url}): ${content}`);
            }
            else {
                // Subsequent pages are pg1, pg2, etc.
                formattedPages.push(`pg${index} (${url}): ${content}`);
            }
        });
        return formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n');
    }
    /**
     * Generate company summary from multi-page content using database prompt
     */
    static async generateCompanySummaryFromMultiPageContent(multiPageContent, aiProvider = 'openrouter') {
        try {
            // Get company summary prompt from database
            const prompt = await apiConfigurationService_1.ApiConfigurationService.getPrompt('company_summary_prompt');
            // Replace template variables with actual data using standardized format
            const finalPrompt = (0, templateHelpers_1.replaceTemplateVariables)(prompt, {
                WEBSITE_CONTENT: multiPageContent
            });
            console.log(`🤖 [Firecrawl]: Generating company summary using ${aiProvider} with ${multiPageContent.length} characters of content`);
            return await this.generateAISummary(finalPrompt, aiProvider);
        }
        catch (error) {
            console.error('❌ [Firecrawl]: Failed to generate company summary from multi-page content:', error);
            return 'Unable to generate company summary from website content.';
        }
    }
    /**
     * Generate AI summary using specified provider
     */
    static async generateAISummary(prompt, aiProvider) {
        switch (aiProvider) {
            case 'gemini':
                return await this.generateSummaryWithGemini(prompt);
            case 'openrouter':
                return await this.generateSummaryWithOpenRouter(prompt);
            default:
                throw new Error(`Unsupported AI provider: ${aiProvider}`);
        }
    }
    /**
     * Generate summary using Google Gemini
     */
    static async generateSummaryWithGemini(prompt) {
        try {
            const apiKey = await apiConfigurationService_1.ApiConfigurationService.getApiKey('geminiApiKey');
            const response = await axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                contents: [{
                        parts: [{ text: prompt }]
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
                },
                timeout: 30000
            });
            return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary generation failed';
        }
        catch (error) {
            console.error('❌ [Firecrawl]: Gemini API error:', error);
            throw new errors_1.AppError(`Gemini summary generation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Generate summary using OpenRouter o1-mini with retry logic
     */
    static async generateSummaryWithOpenRouter(prompt) {
        const maxRetries = 3;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await apiConfigurationService_1.ApiConfigurationService.getApiKey('openrouterApiKey');
                console.log(`🔗 [Firecrawl]: Making OpenRouter API call (attempt ${attempt}/${maxRetries})...`);
                const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: 'openai/o1-mini',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                        'X-Title': 'Cold Outreach AI'
                    },
                    timeout: 120000
                });
                console.log('🔍 [Firecrawl]: OpenRouter response status:', response.status);
                console.log('🔍 [Firecrawl]: OpenRouter response choices length:', response.data?.choices?.length || 0);
                const aiSummary = response.data.choices[0]?.message?.content?.trim();
                if (!aiSummary) {
                    console.error('❌ [Firecrawl]: OpenRouter returned empty response (response truncated to prevent log clutter):', {
                        hasChoices: !!response.data?.choices,
                        choicesLength: response.data?.choices?.length || 0,
                        hasMessage: !!response.data?.choices?.[0]?.message,
                        hasContent: !!response.data?.choices?.[0]?.message?.content,
                        contentLength: response.data?.choices?.[0]?.message?.content?.length || 0
                    });
                    throw new Error('No AI summary returned from OpenRouter API');
                }
                console.log('✅ [Firecrawl]: Successfully generated summary with OpenRouter');
                return aiSummary;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Log input data that was fed to the API when it fails
                console.error(`❌ [Firecrawl]: OpenRouter attempt ${attempt} failed with input data:`, {
                    promptLength: prompt?.length || 0,
                    promptPreview: prompt?.substring(0, 200) + '...',
                    model: 'openai/o1-mini',
                    attempt: attempt,
                    maxRetries: maxRetries
                });
                // Log concise error information without the full response
                if (axios_1.default.isAxiosError(error)) {
                    console.error(`❌ [Firecrawl]: OpenRouter API error (response truncated to prevent log clutter):`, {
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        message: error.message,
                        hasResponseData: !!error.response?.data,
                        responseDataKeys: error.response?.data ? Object.keys(error.response.data) : []
                    });
                }
                else {
                    console.error(`❌ [Firecrawl]: OpenRouter error:`, lastError.message);
                }
                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    console.log(`⏳ [Firecrawl]: Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw new Error(`OpenRouter API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }
    /**
     * Extract business information from content using improved parsing
     */
    static extractBusinessInfo(content) {
        const lines = content.toLowerCase();
        const businessInfo = {
            industry: '',
            products: [],
            services: [],
            keyPeople: [],
            recentNews: [],
            contactInfo: {}
        };
        // Enhanced industry detection
        const industryKeywords = {
            'Technology': ['technology', 'software', 'tech', 'ai', 'artificial intelligence', 'machine learning', 'saas', 'platform'],
            'Healthcare': ['healthcare', 'medical', 'health', 'pharma', 'pharmaceutical', 'biotech', 'clinical'],
            'Finance': ['finance', 'financial', 'fintech', 'banking', 'investment', 'trading', 'crypto'],
            'E-commerce': ['ecommerce', 'e-commerce', 'retail', 'shopping', 'marketplace', 'store'],
            'Education': ['education', 'learning', 'training', 'course', 'university', 'school'],
            'Marketing': ['marketing', 'advertising', 'digital marketing', 'seo', 'social media'],
            'Consulting': ['consulting', 'advisory', 'strategy', 'management consulting']
        };
        for (const [industry, keywords] of Object.entries(industryKeywords)) {
            if (keywords.some(keyword => lines.includes(keyword))) {
                businessInfo.industry = industry;
                break;
            }
        }
        // Extract contact information with improved regex
        const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatch && emailMatch[0]) {
            businessInfo.contactInfo.email = emailMatch[0];
        }
        const phoneMatch = content.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g);
        if (phoneMatch && phoneMatch[0]) {
            businessInfo.contactInfo.phone = phoneMatch[0].trim();
        }
        // Extract products and services
        const productKeywords = ['product', 'solution', 'offering', 'tool'];
        const serviceKeywords = ['service', 'consulting', 'support', 'management'];
        businessInfo.products = this.extractListItems(content, productKeywords);
        businessInfo.services = this.extractListItems(content, serviceKeywords);
        return businessInfo;
    }
    /**
     * Extract social media links from content with improved regex
     */
    static extractSocialMedia(content) {
        const socialMedia = {};
        // LinkedIn
        const linkedinMatch = content.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[^\s"'<>]+/i);
        if (linkedinMatch) {
            socialMedia.linkedin = linkedinMatch[0];
        }
        // Twitter/X
        const twitterMatch = content.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"'<>]+/i);
        if (twitterMatch) {
            socialMedia.twitter = twitterMatch[0];
        }
        // Facebook
        const facebookMatch = content.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i);
        if (facebookMatch) {
            socialMedia.facebook = facebookMatch[0];
        }
        // Instagram
        const instagramMatch = content.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i);
        if (instagramMatch) {
            socialMedia.instagram = instagramMatch[0];
        }
        return socialMedia;
    }
    /**
     * Helper method to extract list items from content
     */
    static extractListItems(content, keywords) {
        const items = [];
        for (const keyword of keywords) {
            const regex = new RegExp(`${keyword}s?[:\\-]?\\s*([^\\n]{1,100})`, 'gi');
            const matches = content.matchAll(regex);
            for (const match of matches) {
                if (match[1]) {
                    const item = match[1].trim().replace(/[^\w\s-]/g, '').trim();
                    if (item.length > 3 && !items.includes(item)) {
                        items.push(item);
                    }
                }
            }
        }
        return items.slice(0, 5); // Limit to 5 items
    }
    /**
     * Simple URL scraping method for general use
     */
    static async scrapeUrl(url) {
        try {
            console.log(`🔍 [Firecrawl]: Scraping URL: ${url}`);
            const axiosInstance = await this.createAxiosInstance();
            const scrapePayload = {
                url: url,
                formats: ["markdown"], // Only request markdown format
                onlyMainContent: true, // Extract only main content
                maxAge: 3600000, // Cache for 1 hour
                mobile: false, // Use desktop user agent
                storeInCache: true // Store in cache
            };
            const response = await this.retryRequest(async () => {
                return await axiosInstance.post('/v1/scrape', scrapePayload);
            });
            if (!response.data?.success) {
                throw new Error(`Firecrawl scraping failed: ${response.data?.error || 'Unknown error'}`);
            }
            const scrapedData = response.data.data;
            if (!scrapedData?.markdown) {
                throw new Error('No content returned from Firecrawl');
            }
            return {
                content: scrapedData.markdown,
                metadata: scrapedData.metadata
            };
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to scrape URL ${url}:`, error);
            return null;
        }
    }
}
exports.FirecrawlService = FirecrawlService;
