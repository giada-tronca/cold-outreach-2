"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirecrawlService = void 0;
const axios_1 = __importDefault(require("axios"));
const apiConfigurationService_1 = require("./apiConfigurationService");
const errors_1 = require("@/utils/errors");
/**
 * Firecrawl API Service
 * Handles website content scraping and extraction
 */
class FirecrawlService {
    /**
     * Scrape website content and extract company information
     * TEMPORARILY DEACTIVATED - Returns dummy data to avoid API costs
     */
    static async scrapeCompanyWebsite(url) {
        try {
            console.log(`🔍 [Firecrawl]: DUMMY MODE - Simulating scraping website: ${url}`);
            // Return dummy data instead of making API call
            const dummyData = {
                url: url,
                title: 'Sample Company Inc.',
                description: 'A leading technology company specializing in innovative solutions for modern businesses.',
                content: 'Sample Company Inc. is a forward-thinking technology firm that has been serving clients worldwide since 2015. We specialize in software development, digital transformation, and cloud solutions. Our team of experienced professionals is dedicated to delivering high-quality products and services that help businesses grow and succeed in the digital age.',
                markdown: '# Sample Company Inc.\n\nA leading technology company specializing in innovative solutions for modern businesses.\n\n## About Us\nSample Company Inc. is a forward-thinking technology firm that has been serving clients worldwide since 2015. We specialize in software development, digital transformation, and cloud solutions.\n\n## Our Services\n- Software Development\n- Digital Transformation\n- Cloud Solutions\n- Consulting Services\n\n## Contact\nEmail: contact@samplecompany.com\nPhone: +1-555-0123',
                businessInfo: {
                    industry: 'Technology',
                    products: ['Software Solutions', 'Cloud Platforms', 'Digital Tools'],
                    services: ['Software Development', 'Digital Transformation', 'Cloud Migration', 'Consulting'],
                    keyPeople: ['John Smith - CEO', 'Jane Doe - CTO', 'Mike Johnson - VP Sales'],
                    recentNews: ['Company launches new AI platform', 'Expands operations to Europe', 'Wins industry award'],
                    contactInfo: {
                        email: 'contact@samplecompany.com',
                        phone: '+1-555-0123',
                        address: '123 Tech Street, Silicon Valley, CA 94000'
                    }
                },
                socialMedia: {
                    linkedin: 'https://linkedin.com/company/samplecompany',
                    twitter: 'https://twitter.com/samplecompany'
                },
                metadata: {
                    language: 'en',
                    statusCode: 200,
                    scrapedAt: new Date().toISOString()
                }
            };
            console.log(`✅ [Firecrawl]: DUMMY MODE - Returning sample data for: ${url}`);
            return dummyData;
            // ORIGINAL CODE (commented out to avoid API costs):
            /*
            const axiosInstance = await this.createAxiosInstance()
            const config = await ApiConfigurationService.getModelConfiguration()

            // Prepare scraping request with correct parameters based on official documentation
            const scrapePayload = {
                url: url,
                formats: ['markdown'],
                onlyMainContent: true,
                timeout: 30000
            }

            const response = await this.retryRequest(
                () => axiosInstance.post('/v1/scrape', scrapePayload),
                config.retryAttempts
            ) as any

            const data = response.data as FirecrawlScrapeResponse

            if (!data.success) {
                throw new Error(data.error || 'Scraping failed')
            }

            const scrapedData = data.data
            // ... rest of original implementation
            */
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to scrape website ${url}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const message = error.response.data?.error || error.message;
                throw new errors_1.AppError(`Firecrawl API error (${status}): ${message}`);
            }
            throw new errors_1.AppError(`Firecrawl scraping failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Extract structured data from a website using JSON mode
     * TEMPORARILY DEACTIVATED - Returns dummy data to avoid API costs
     */
    static async extractCompanyData(url, extractionPrompt) {
        try {
            console.log(`🔍 [Firecrawl]: DUMMY MODE - Simulating data extraction from: ${url}`);
            // Return dummy extracted company data
            const dummyExtractedData = {
                company_name: 'Sample Company Inc.',
                description: 'A leading technology company specializing in innovative solutions',
                industry: 'Technology',
                services: ['Software Development', 'Cloud Solutions', 'Digital Transformation'],
                products: ['Enterprise Software', 'Cloud Platform', 'Mobile Apps'],
                key_people: ['John Smith - CEO', 'Jane Doe - CTO'],
                contact_info: {
                    email: 'contact@samplecompany.com',
                    phone: '+1-555-0123',
                    address: '123 Tech Street, Silicon Valley, CA'
                }
            };
            console.log(`✅ [Firecrawl]: DUMMY MODE - Returning sample extracted data for: ${url}`);
            return dummyExtractedData;
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
     * Search for company information - simplified to use basic scraping
     * since the /search endpoint has different requirements
     */
    static async searchCompanyInfo(companyName, domain) {
        try {
            console.log(`🔍 [Firecrawl]: Searching for company info: ${companyName}`);
            // If domain is provided, directly scrape the domain
            if (domain) {
                const websiteData = await this.scrapeCompanyWebsite(`https://${domain}`);
                return [websiteData];
            }
            // For basic company search without domain, we'd need to use external search
            // and then scrape results, which is complex. Return empty for now.
            console.log(`⚠️ [Firecrawl]: Company search without domain not implemented`);
            return [];
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to search for ${companyName}:`, error);
            throw error;
        }
    }
    /**
     * Get company summary from website content
     */
    static async getCompanySummary(url) {
        try {
            const websiteData = await this.scrapeCompanyWebsite(url);
            // Extract relevant information for summary
            const summary = [
                websiteData.title && `Company: ${websiteData.title}`,
                websiteData.businessInfo?.industry && `Industry: ${websiteData.businessInfo.industry}`,
                websiteData.description && `Description: ${websiteData.description}`,
                websiteData.businessInfo?.products?.length &&
                    `Products: ${websiteData.businessInfo.products.slice(0, 3).join(', ')}`,
                websiteData.businessInfo?.services?.length &&
                    `Services: ${websiteData.businessInfo.services.slice(0, 3).join(', ')}`,
            ].filter(Boolean).join('\n');
            return summary || 'No summary available';
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to get company summary for ${url}:`, error);
            throw error;
        }
    }
    /**
     * Start a crawl job for comprehensive website analysis
     * TEMPORARILY DEACTIVATED - Returns dummy response to avoid API costs
     */
    static async startCrawlJob(url, options = {}) {
        try {
            console.log(`🚀 [Firecrawl]: DUMMY MODE - Simulating crawl job for: ${url}`);
            // Return dummy job ID and status URL
            const dummyJobId = `dummy-job-${Date.now()}`;
            console.log(`✅ [Firecrawl]: DUMMY MODE - Crawl job simulated with ID: ${dummyJobId}`);
            return {
                jobId: dummyJobId,
                statusUrl: `dummy-status-${dummyJobId}`
            };
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to start crawl job for ${url}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const message = error.response.data?.error || error.message;
                // Handle payment/billing errors specifically
                if (status === 402) {
                    console.log(`💳 [Firecrawl]: Payment required - please upgrade your Firecrawl plan at https://firecrawl.dev/pricing`);
                    throw new errors_1.AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan at https://firecrawl.dev/pricing`);
                }
                throw new errors_1.AppError(`Firecrawl crawl start error (${status}): ${message}`);
            }
            throw new errors_1.AppError(`Firecrawl crawl job failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Poll crawl job status until completion
     * TEMPORARILY DEACTIVATED - Returns dummy completed status to avoid API costs
     */
    static async pollCrawlStatus(jobId, maxWaitTime = 300000) {
        try {
            console.log(`🔍 [Firecrawl]: DUMMY MODE - Simulating poll crawl status for job: ${jobId}`);
            // Return dummy completed crawl result with sample pages
            const dummyResult = {
                success: true,
                status: 'completed',
                current: 3,
                total: 3,
                data: [
                    {
                        content: 'Home page content for Sample Company Inc. We provide innovative technology solutions.',
                        markdown: '# Sample Company Inc.\n\nWe provide innovative technology solutions for modern businesses.',
                        html: '<h1>Sample Company Inc.</h1><p>We provide innovative technology solutions for modern businesses.</p>',
                        metadata: {
                            title: 'Sample Company Inc. - Home',
                            description: 'Leading technology company',
                            language: 'en',
                            sourceURL: 'https://example.com',
                            statusCode: 200
                        }
                    },
                    {
                        content: 'About page content - Our company was founded in 2015 with a mission to revolutionize business technology.',
                        markdown: '# About Us\n\nOur company was founded in 2015 with a mission to revolutionize business technology.',
                        html: '<h1>About Us</h1><p>Our company was founded in 2015 with a mission to revolutionize business technology.</p>',
                        metadata: {
                            title: 'About Us - Sample Company Inc.',
                            description: 'Learn about our company',
                            language: 'en',
                            sourceURL: 'https://example.com/about',
                            statusCode: 200
                        }
                    },
                    {
                        content: 'Services page content - We offer software development, cloud solutions, and digital transformation services.',
                        markdown: '# Our Services\n\nWe offer software development, cloud solutions, and digital transformation services.',
                        html: '<h1>Our Services</h1><p>We offer software development, cloud solutions, and digital transformation services.</p>',
                        metadata: {
                            title: 'Services - Sample Company Inc.',
                            description: 'Our technology services',
                            language: 'en',
                            sourceURL: 'https://example.com/services',
                            statusCode: 200
                        }
                    }
                ]
            };
            console.log(`✅ [Firecrawl]: DUMMY MODE - Returning completed crawl status for job: ${jobId}`);
            return dummyResult;
        }
        catch (error) {
            console.error(`❌ [Firecrawl]: Failed to poll crawl status for ${jobId}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const message = error.response.data?.error || error.message;
                // Handle payment/billing errors specifically
                if (status === 402) {
                    console.log(`💳 [Firecrawl]: Payment required - please upgrade your Firecrawl plan at https://firecrawl.dev/pricing`);
                    throw new errors_1.AppError(`Firecrawl billing issue: ${message}. Please upgrade your plan at https://firecrawl.dev/pricing`);
                }
                throw new errors_1.AppError(`Firecrawl crawl status error (${status}): ${message}`);
            }
            throw new errors_1.AppError(`Firecrawl crawl polling failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Crawl website and generate AI company summary using database prompt
     */
    static async crawlAndGenerateCompanySummary(url, aiProvider = 'openrouter') {
        try {
            console.log(`🔍 [Firecrawl]: Starting comprehensive crawl and summary for: ${url}`);
            // Start crawl job with 10 pages
            const { jobId } = await this.startCrawlJob(url, {
                maxPages: 10,
                allowBackwardLinks: false,
                allowExternalLinks: false
            });
            // Poll for completion
            const crawlResult = await this.pollCrawlStatus(jobId);
            if (crawlResult.status !== 'completed' || !crawlResult.data) {
                throw new Error('Crawl job did not complete successfully');
            }
            // Extract content from all pages
            const pagesContent = crawlResult.data.map(page => page.content || page.markdown);
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
            // Debug: console.log(`🔍 [Firecrawl]: Page ${index + 1} - markdown: ${page.markdown?.length || 0} chars, content: ${page.content?.length || 0} chars`)
            if (index === 0) {
                // First page is the home page
                formattedPages.push(`home page (${url}): ${content}`);
            }
            else {
                // Subsequent pages are pg1, pg2, etc.
                formattedPages.push(`pg${index} (${url}): ${content}`);
            }
        });
        // Debug: console.log(`🔍 [Firecrawl]: Formatted content total length: ${formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n').length} chars`)
        return formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n');
    }
    /**
     * Generate company summary from multi-page content using database prompt
     */
    static async generateCompanySummaryFromMultiPageContent(multiPageContent, aiProvider = 'openrouter') {
        try {
            // Get company summary prompt from database
            const prompt = await apiConfigurationService_1.ApiConfigurationService.getPrompt('company_summary_prompt');
            // Replace placeholder with the multi-page content
            const finalPrompt = prompt.replace('${WEBSITE_CONTENT}', multiPageContent);
            console.log(`🤖 [Firecrawl]: Generating company summary using ${aiProvider} with ${multiPageContent.length} characters of content`);
            // Debug: console.log(`🔍 [Firecrawl]: Content preview: ${multiPageContent.substring(0, 200)}...`)
            return await this.generateAISummary(finalPrompt, aiProvider);
        }
        catch (error) {
            console.error('❌ [Firecrawl]: Failed to generate company summary from multi-page content:', error);
            return 'Unable to generate company summary from website content.';
        }
    }
    /**
     * Generate AI summary using database prompt
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
                    ],
                    max_completion_tokens: 8000 // Increased from 2000 to handle O1-Mini reasoning + response
                    // Note: temperature is not supported by o1-mini model
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000 // Increased from 90s to 120s for O1-Mini reasoning
                });
                console.log('🔍 [Firecrawl]: OpenRouter response status:', response.status);
                console.log('🔍 [Firecrawl]: OpenRouter response choices length:', response.data?.choices?.length || 0);
                const aiSummary = response.data.choices[0]?.message?.content?.trim();
                if (!aiSummary) {
                    console.error('❌ [Firecrawl]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2));
                    throw new Error('No AI summary returned from OpenRouter API');
                }
                console.log('✅ [Firecrawl]: Successfully generated summary with OpenRouter');
                return aiSummary;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.error(`❌ [Firecrawl]: Attempt ${attempt} failed:`, lastError.message);
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
     * Generate company summary from scraped content
     * @deprecated Use generateCompanySummaryFromMultiPageContent instead
     */
    static async generateCompanySummaryFromContent(content) {
        try {
            // Get company summary prompt from database
            const prompt = await apiConfigurationService_1.ApiConfigurationService.getPrompt('company_summary_prompt');
            // Replace placeholder with the content
            const finalPrompt = prompt.replace('${WEBSITE_CONTENT}', content.substring(0, 8000));
            return await this.generateAISummary(finalPrompt, 'openrouter');
        }
        catch (error) {
            console.error('❌ [Firecrawl]: Failed to generate company summary:', error);
            return 'Unable to generate company summary at this time.';
        }
    }
}
exports.FirecrawlService = FirecrawlService;
