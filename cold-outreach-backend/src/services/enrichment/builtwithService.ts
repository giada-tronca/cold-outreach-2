import { FirecrawlService } from './firecrawlService'
import { ApiConfigurationService } from './apiConfigurationService'
import axios from 'axios'





export interface TechStackData {
    domain: string
    technologies: {
        analytics?: string[]
        advertising?: string[]
        ecommerce?: string[]
        javascript?: string[]
        css?: string[]
        cms?: string[]
        hosting?: string[]
        cdn?: string[]
        database?: string[]
        server?: string[]
        framework?: string[]
        programming?: string[]
        marketing?: string[]
        productivity?: string[]
        security?: string[]
        widgets?: string[]
        mobile?: string[]
        payment?: string[]
        social?: string[]
        other?: string[]
    }
    companyInfo?: {
        vertical?: string
        size?: string
        revenue?: string
        social?: string[]
        emails?: string[]
        phones?: string[]
        names?: string[]
    }
    spending?: Array<{
        category?: string
        amount?: number
        isPaid?: boolean
    }>
    metadata?: {
        lastUpdated?: string
        dataAge?: number
        isPremiumData?: boolean
    }
    rawData?: any
}

/**
 * BuiltWith Service (using Firecrawl)
 * Handles technology stack detection by scraping builtwith.com
 */
export class BuiltWithService {



    /**
     * Get technology stack for a domain using Firecrawl to scrape BuiltWith.com
     */
    static async getTechStack(domain: string): Promise<TechStackData> {
        try {
            console.log(`🔍 [BuiltWith]: Analyzing tech stack for: ${domain}`)

            // Clean the domain by removing www. prefix for BuiltWith
            const cleanDomain = domain.replace(/^www\./, '')
            console.log(`🔍 [BuiltWith]: Using clean domain: ${cleanDomain}`)

            // Use Firecrawl to scrape the BuiltWith.com page for this domain
            const builtwithUrl = `https://builtwith.com/${cleanDomain}`
            console.log(`🔍 [BuiltWith]: Scraping ${builtwithUrl}`)

            const scrapedData = await FirecrawlService.scrapeCompanyWebsite(builtwithUrl)

            // Debug what we're getting from Firecrawl
            console.log(`🔍 [BuiltWith]: Firecrawl response for ${builtwithUrl}:`, {
                hasContent: !!scrapedData.content,
                hasMarkdown: !!scrapedData.markdown,
                contentLength: scrapedData.content?.length || 0,
                markdownLength: scrapedData.markdown?.length || 0,
                title: scrapedData.title,
                hasRawData: !!scrapedData.rawData,
                rawDataKeys: scrapedData.rawData ? Object.keys(scrapedData.rawData) : [],
                url: scrapedData.url
            })

            // Use either content or markdown
            const contentToProcess = scrapedData.content || scrapedData.markdown ||
                scrapedData.rawData?.content || scrapedData.rawData?.markdown

            if (!contentToProcess) {
                console.error(`❌ [BuiltWith]: No content or markdown data retrieved from BuiltWith.com page for ${builtwithUrl}`)
                console.error(`❌ [BuiltWith]: Full scraped data structure:`, JSON.stringify(scrapedData, null, 2))
                throw new Error('No data retrieved from BuiltWith.com page')
            }

            console.log(`🔍 [BuiltWith]: Processing ${contentToProcess.length} characters of content`)

            // Parse the scraped content to extract technologies
            const technologies = this.parseBuiltWithContent(contentToProcess)

            const techStackData: TechStackData = {
                domain: cleanDomain, // Use clean domain in response
                technologies,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    dataAge: 0,
                    isPremiumData: false
                },
                rawData: scrapedData
            }

            console.log(`✅ [BuiltWith]: Successfully analyzed tech stack for ${cleanDomain}`)
            return techStackData

        } catch (error) {
            console.error(`❌ [BuiltWith]: Failed to analyze tech stack for ${domain}:`, error)
            throw error
        }
    }

    /**
     * Parse BuiltWith.com scraped content to extract technologies
     */
    private static parseBuiltWithContent(content: string): TechStackData['technologies'] {
        const technologies: TechStackData['technologies'] = {}

        try {
            console.log(`🔍 [BuiltWith]: Starting to parse content (${content.length} characters)`)

            // Multiple patterns to match different BuiltWith HTML structures
            const techPatterns = [
                // Pattern 1: <h2><img...><a class="text-dark" href="...">Technology Name</a></h2>
                /<h2[^>]*>.*?<a[^>]*class="text-dark"[^>]*>([^<]+)<\/a>.*?<\/h2>/gi,
                // Pattern 2: <a class="text-dark" href="...">Technology Name</a> (without h2)
                /<a[^>]*class="text-dark"[^>]*>([^<]+)<\/a>/gi,
                // Pattern 3: Technology names in markdown format (from firecrawl markdown)
                /##\s+([^\n]+)/g,
                // Pattern 4: Links in markdown that might be technologies
                /\[([^\]]+)\]\([^)]*builtwith\.com[^)]*\)/gi
            ]

            const foundTechs: string[] = []

            // Try each pattern
            for (let i = 0; i < techPatterns.length; i++) {
                const pattern = techPatterns[i]
                if (!pattern) continue

                const matches = content.match(pattern)

                if (matches) {
                    console.log(`🔍 [BuiltWith]: Pattern ${i + 1} found ${matches.length} matches`)

                    for (const match of matches) {
                        let techName: string | null = null

                        if (i === 0 || i === 1) {
                            // HTML patterns - extract from link text
                            const nameMatch = match.match(/<a[^>]*class="text-dark"[^>]*>([^<]+)<\/a>/i)
                            if (nameMatch && nameMatch[1]) {
                                techName = nameMatch[1].trim()
                            }
                        } else if (i === 2) {
                            // Markdown header pattern
                            const nameMatch = match.match(/##\s+([^\n]+)/)
                            if (nameMatch && nameMatch[1]) {
                                techName = nameMatch[1].trim()
                            }
                        } else if (i === 3) {
                            // Markdown link pattern
                            const nameMatch = match.match(/\[([^\]]+)\]/)
                            if (nameMatch && nameMatch[1]) {
                                techName = nameMatch[1].trim()
                            }
                        }

                        if (techName &&
                            techName.length > 1 &&
                            techName.length < 100 &&
                            !foundTechs.includes(techName) &&
                            !techName.toLowerCase().includes('builtwith') &&
                            !techName.toLowerCase().includes('usage statistics') &&
                            !techName.toLowerCase().includes('download list')) {
                            foundTechs.push(techName)
                        }
                    }
                }
            }

            // If no technologies found with patterns, try simple text extraction
            if (foundTechs.length === 0) {
                console.log('🔍 [BuiltWith]: No matches with patterns, trying fallback parsing')
                return this.fallbackTechParsing(content)
            }

            console.log(`🔍 [BuiltWith]: Extracted ${foundTechs.length} technologies: ${foundTechs.slice(0, 10).join(', ')}${foundTechs.length > 10 ? '...' : ''}`)

            // Categorize technologies based on their names
            this.categorizeTechnologies(foundTechs, technologies)

            return technologies

        } catch (error) {
            console.error('❌ [BuiltWith]: Error parsing content:', error)
            // Fallback to simple keyword search
            return this.fallbackTechParsing(content)
        }
    }

    /**
     * Categorize technologies into appropriate categories
     */
    private static categorizeTechnologies(foundTechs: string[], technologies: TechStackData['technologies']) {
        const categoryMappings = {
            analytics: ['Google Analytics', 'Microsoft Clarity', 'Google Tag Manager', 'Mixpanel', 'Segment', 'Hotjar', 'Adobe Analytics', 'Crazy Egg', 'Heap', 'Amplitude'],
            javascript: ['jQuery', 'React', 'Angular', 'Vue.js', 'Next.js', 'Nuxt.js', 'Ember.js', 'Backbone.js', 'Knockout.js', 'Underscore.js', 'Lodash', 'Moment.js', 'Chart.js', 'D3.js', 'Three.js', 'Flickity', 'Swiper', 'Slick', 'core-js', 'JavaScript Modules', 'HTML5 History API'],
            ecommerce: ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'PrestaShop', 'OpenCart', 'Stripe', 'PayPal', 'Square', 'Klarna', 'Shopify Pay', 'Apple Pay', 'Google Pay', 'Amazon Pay'],
            cms: ['WordPress', 'Drupal', 'Joomla', 'Ghost', 'Contentful', 'Strapi', 'Craft CMS', 'Webflow', 'Squarespace', 'Wix'],
            hosting: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Heroku', 'Netlify', 'Vercel', 'DigitalOcean', 'Linode', 'Cloudflare', 'Cloudflare Hosting', 'Shopify Hosted'],
            cdn: ['CloudFlare', 'Amazon CloudFront', 'MaxCDN', 'KeyCDN', 'Fastly', 'jsDelivr', 'CDN JS', 'AJAX Libraries API', 'GStatic Google Static Content', 'Cloudflare CDN'],
            css: ['Bootstrap', 'Tailwind CSS', 'Foundation', 'Bulma', 'Materialize', 'Semantic UI', 'Pure CSS', 'Skeleton'],
            database: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'MariaDB', 'Oracle', 'SQL Server', 'DynamoDB', 'Cassandra'],
            framework: ['Next.js', 'Nuxt.js', 'Gatsby', 'Svelte', 'SvelteKit', 'Remix', 'Astro', 'Laravel', 'Django', 'Ruby on Rails', 'Express.js', 'Koa.js', 'Fastify', 'Organization Schema'],
            widgets: ['Google Font API', 'Font Awesome', 'Typekit', 'Google Fonts', 'Slack', 'Shopify Inbox', 'Live Chat', 'Intercom', 'Zendesk', 'Drift', 'Crisp', 'Tawk.to', 'Kiwi Sizing', 'Global Privacy Control'],
            advertising: ['Google Ads', 'Facebook Ads', 'Google AdSense', 'Google DoubleClick', 'Criteo', 'Outbrain', 'Taboola', 'Amazon DSP', 'Microsoft Advertising'],
            marketing: ['Mailchimp', 'Constant Contact', 'HubSpot', 'Salesforce', 'Marketo', 'Pardot', 'ActiveCampaign', 'ConvertKit', 'Drip', 'Klaviyo', 'Shopify Email Marketing'],
            mobile: ['Progressive Web App', 'AMP', 'Responsive Design', 'Mobile Optimized', 'Viewport Meta', 'IPhone / Mobile Compatible'],
            security: ['SSL Certificate', 'Let\'s Encrypt', 'Cloudflare SSL', 'HTTPS', 'HSTS', 'Content Security Policy', 'DMARC', 'SPF'],
            social: ['Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'Pinterest', 'Snapchat', 'WhatsApp', 'Telegram', 'Spotify Link', 'Bandcamp', 'YouTube Link'],
            server: ['Nginx', 'Apache', 'IIS', 'LiteSpeed', 'Node.js', 'PHP', 'Python', 'Ruby', 'Java', 'Go', 'Rust', '.NET'],
            payment: ['Stripe', 'PayPal', 'Square', 'Braintree', 'Adyen', 'Worldpay', 'Authorize.Net', 'Shopify Payments', 'Apple Pay', 'Google Pay', 'Amazon Pay', 'Klarna', 'Afterpay', 'Shopify Pay', 'American Express', 'Visa', 'MasterCard', 'Maestro', 'UnionPay', 'Euro', 'Pound Sterling', 'Japanese Yen'],
            productivity: ['Google Workspace', 'Microsoft 365', 'Slack', 'Asana', 'Trello', 'Monday.com', 'Notion', 'Airtable', 'Zapier', 'IFTTT'],
            language: ['English HREF LANG', 'French - Inferred', 'Spanish', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean'],
            shipping: ['DHL', 'UPS', 'FedEx', 'USPS', 'TNT', 'Royal Mail', 'Canada Post', 'Australia Post', 'route', 'USPS First Class', 'Ships to China', 'Ships to Japan', 'USA and Canada Shipping', 'Scandinavian Shipping', 'Shipping to over 100 Countries'],
            other: ['CrUX Dataset', 'CrUX Top 5m', 'Cloudflare Radar', 'Cloudflare Radar Top 500k', 'IPv6', 'Content Delivery Network', 'Google Webmaster', 'Google Search Appliance', 'Google Apps for Business', 'DMARC', 'DMARC None', 'DMARC Reject', 'SSL by Default', 'Cloudflare DNS', 'Google AdsBot Disallow', 'Ahrefs Bot Disallow', 'Shipping']
        }

        for (const tech of foundTechs) {
            let categorized = false

            for (const [category, techList] of Object.entries(categoryMappings)) {
                if (techList.some(categoryTech =>
                    tech.toLowerCase().includes(categoryTech.toLowerCase()) ||
                    categoryTech.toLowerCase().includes(tech.toLowerCase())
                )) {
                    if (!technologies[category as keyof TechStackData['technologies']]) {
                        technologies[category as keyof TechStackData['technologies']] = []
                    }
                    technologies[category as keyof TechStackData['technologies']]!.push(tech)
                    categorized = true
                    break
                }
            }

            // If not categorized, put in 'other'
            if (!categorized) {
                if (!technologies.other) {
                    technologies.other = []
                }
                technologies.other.push(tech)
            }
        }
    }

    /**
     * Fallback parsing method using simple keyword search
     */
    private static fallbackTechParsing(content: string): TechStackData['technologies'] {
        const technologies: TechStackData['technologies'] = {}

        console.log(`🔍 [BuiltWith]: Using fallback parsing for ${content.length} characters`)

        // Common technology patterns to look for (case-insensitive)
        const techPatterns = {
            javascript: ['react', 'vue', 'angular', 'jquery', 'javascript', 'node.js', 'typescript', 'next.js', 'nuxt'],
            css: ['bootstrap', 'tailwind', 'css', 'scss', 'sass', 'less'],
            framework: ['next.js', 'nuxt', 'gatsby', 'svelte', 'express', 'laravel', 'django'],
            database: ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite'],
            hosting: ['aws', 'google cloud', 'azure', 'heroku', 'netlify', 'vercel', 'cloudflare'],
            analytics: ['google analytics', 'mixpanel', 'segment', 'hotjar', 'microsoft clarity', 'facebook pixel', 'facebook signal'],
            cms: ['wordpress', 'drupal', 'contentful', 'strapi', 'ghost'],
            ecommerce: ['shopify', 'woocommerce', 'magento', 'stripe', 'paypal'],
            cdn: ['cloudflare', 'aws cloudfront', 'fastly', 'keycdn', 'jsdelivr'],
            server: ['nginx', 'apache', 'iis', 'litespeed'],
            widgets: ['slack', 'gtranslate', 'intercom', 'zendesk', 'drift'],
            social: ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok'],
            payment: ['stripe', 'paypal', 'square', 'braintree', 'klarna'],
            other: []
        }

        const contentLower = content.toLowerCase()

        // Search for technologies in the content
        for (const [category, techs] of Object.entries(techPatterns)) {
            const foundTechs: string[] = []

            for (const tech of techs) {
                // Look for the technology name in various formats
                const patterns = [
                    tech.toLowerCase(),
                    tech.toLowerCase().replace(/\s+/g, ''),
                    tech.toLowerCase().replace(/\s+/g, '-'),
                    tech.toLowerCase().replace(/\./g, '')
                ]

                for (const pattern of patterns) {
                    if (contentLower.includes(pattern)) {
                        const properName = tech.split(' ').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')

                        if (!foundTechs.includes(properName)) {
                            foundTechs.push(properName)
                            break // Found this tech, move to next
                        }
                    }
                }
            }

            if (foundTechs.length > 0) {
                technologies[category as keyof TechStackData['technologies']] = foundTechs
            }
        }

        const totalFound = Object.values(technologies).flat().length
        console.log(`🔍 [BuiltWith]: Fallback parsing found ${totalFound} technologies across ${Object.keys(technologies).length} categories`)

        return technologies
    }

    /**
     * Get technology trends for a domain
     */
    static async getTechTrends(domain: string): Promise<{ trends: string[]; emerging: string[]; declining: string[] }> {
        try {
            const techStack = await this.getTechStack(domain)

            // Analyze trends based on detected technologies
            const allTechs = Object.values(techStack.technologies).flat()

            const trends = this.analyzeTechTrends(allTechs)
            return trends

        } catch (error) {
            console.error(`❌ [BuiltWith]: Failed to get tech trends for ${domain}:`, error)
            return {
                trends: ['React', 'TypeScript', 'Next.js'],
                emerging: ['Vercel', 'Tailwind CSS', 'GraphQL'],
                declining: ['jQuery', 'Bootstrap', 'Moment.js']
            }
        }
    }





    /**
     * Analyze technology trends
     */
    private static analyzeTechTrends(technologies: string[]): { trends: string[]; emerging: string[]; declining: string[] } {
        // Mock analysis - in reality this would use historical data
        const modernTechs = ['React', 'Vue.js', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL', 'Vercel', 'Netlify']
        const legacyTechs = ['jQuery', 'Bootstrap', 'Moment.js', 'AngularJS', 'Bower', 'Grunt', 'Gulp']

        const trends = technologies.filter(tech =>
            ['JavaScript', 'CSS', 'HTML', 'React', 'Node.js'].some(t =>
                tech.toLowerCase().includes(t.toLowerCase())
            )
        )

        const emerging = technologies.filter(tech =>
            modernTechs.some(t => tech.toLowerCase().includes(t.toLowerCase()))
        )

        const declining = technologies.filter(tech =>
            legacyTechs.some(t => tech.toLowerCase().includes(t.toLowerCase()))
        )

        return { trends, emerging, declining }
    }



    /**
     * Get company technology summary
     */
    static async getTechSummary(domain: string): Promise<string> {
        try {
            const techStack = await this.getTechStack(domain)

            const summary = []

            // Add main technologies
            const mainTechs = [
                ...techStack.technologies.framework || [],
                ...techStack.technologies.javascript || [],
                ...techStack.technologies.css || [],
                ...techStack.technologies.database || []
            ].slice(0, 5)

            if (mainTechs.length > 0) {
                summary.push(`Primary Technologies: ${mainTechs.join(', ')}`)
            }

            // Add hosting/infrastructure
            const infrastructure = [
                ...techStack.technologies.hosting || [],
                ...techStack.technologies.cdn || [],
                ...techStack.technologies.security || []
            ].slice(0, 3)

            if (infrastructure.length > 0) {
                summary.push(`Infrastructure: ${infrastructure.join(', ')}`)
            }

            // Add business tools
            const businessTools = [
                ...techStack.technologies.analytics || [],
                ...techStack.technologies.marketing || [],
                ...techStack.technologies.productivity || []
            ].slice(0, 3)

            if (businessTools.length > 0) {
                summary.push(`Business Tools: ${businessTools.join(', ')}`)
            }

            return summary.join('\n') || 'No technology information available'

        } catch (error) {
            console.error(`❌ [BuiltWith]: Failed to get tech summary for ${domain}:`, error)
            return 'Technology stack analysis unavailable'
        }
    }

    /**
     * Get comprehensive BuiltWith company summary using AI LLM
     * This method scrapes ALL data from BuiltWith and sends it to AI for analysis
     */
    static async getBuiltWithSummary(domain: string, aiProvider: 'gemini' | 'openrouter' = 'openrouter'): Promise<string> {
        try {
            console.log(`🔍 [BuiltWith]: Getting comprehensive summary for: ${domain}`)

            // Clean the domain by removing www. prefix for BuiltWith
            const cleanDomain = domain.replace(/^www\./, '')
            console.log(`🔍 [BuiltWith]: Using clean domain: ${cleanDomain}`)

            // Use Firecrawl to scrape the BuiltWith.com page for this domain
            const builtwithUrl = `https://builtwith.com/${cleanDomain}`
            console.log(`🔍 [BuiltWith]: Scraping ${builtwithUrl}`)

            const scrapedData = await FirecrawlService.scrapeCompanyWebsite(builtwithUrl)

            // Get the content to process - use ALL available data
            const contentToProcess = scrapedData.content || scrapedData.markdown ||
                scrapedData.rawData?.content || scrapedData.rawData?.markdown

            if (!contentToProcess) {
                console.error(`❌ [BuiltWith]: No content retrieved from BuiltWith.com page for ${builtwithUrl}`)
                throw new Error('No data retrieved from BuiltWith.com page')
            }

            console.log(`🔍 [BuiltWith]: Processing ${contentToProcess.length} characters of content for AI analysis`)

            // Format ALL the scraped data for AI analysis
            const formattedData = this.formatBuiltWithDataForAI(scrapedData, cleanDomain)

            // Get the BuiltWith summary prompt from database
            const prompt = await ApiConfigurationService.getPrompt('tech_stack_prompt')
            const finalPrompt = prompt.replace('{builtwith_content_placeholder}', formattedData)

            // Generate summary using AI LLM
            let aiSummary: string
            if (aiProvider === 'gemini') {
                aiSummary = await this.generateSummaryWithGemini(finalPrompt)
            } else {
                aiSummary = await this.generateSummaryWithOpenRouter(finalPrompt)
            }

            console.log(`✅ [BuiltWith]: Successfully generated AI summary for ${cleanDomain}`)
            return aiSummary

        } catch (error) {
            console.error(`❌ [BuiltWith]: Failed to generate BuiltWith summary for ${domain}:`, error)
            throw error
        }
    }

    /**
     * Format ALL BuiltWith scraped data for AI analysis
     * This ensures the AI gets comprehensive data about the company's tech stack
     */
    private static formatBuiltWithDataForAI(scrapedData: any, domain: string): string {
        const sections: string[] = []

        // Add basic information
        sections.push(`=== BUILTWITH ANALYSIS FOR ${domain.toUpperCase()} ===`)
        sections.push(`Domain: ${domain}`)
        sections.push(`Analyzed URL: https://builtwith.com/${domain}`)
        sections.push(`Scraped at: ${new Date().toISOString()}`)
        sections.push('')

        // Add title and description if available
        if (scrapedData.title) {
            sections.push(`Page Title: ${scrapedData.title}`)
        }
        if (scrapedData.description) {
            sections.push(`Page Description: ${scrapedData.description}`)
        }

        // Add the main content - this is the most important part
        sections.push('=== COMPLETE BUILTWITH CONTENT ===')
        const mainContent = scrapedData.content || scrapedData.markdown ||
            scrapedData.rawData?.content || scrapedData.rawData?.markdown || 'No content available'

        sections.push(mainContent)

        // Add any additional metadata
        if (scrapedData.metadata) {
            sections.push('')
            sections.push('=== METADATA ===')
            sections.push(JSON.stringify(scrapedData.metadata, null, 2))
        }

        // Add raw data if available (for debugging)
        if (scrapedData.rawData && typeof scrapedData.rawData === 'object') {
            sections.push('')
            sections.push('=== ADDITIONAL RAW DATA ===')
            Object.entries(scrapedData.rawData).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 0) {
                    sections.push(`${key.toUpperCase()}: ${value}`)
                }
            })
        }

        const formattedData = sections.join('\n')
        console.log(`🔍 [BuiltWith]: Formatted ${formattedData.length} characters for AI analysis`)

        return formattedData
    }

    /**
     * Generate summary using Google Gemini Flash 2.0
     */
    private static async generateSummaryWithGemini(prompt: string): Promise<string> {
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
                },
                timeout: 45000 // 45 seconds for comprehensive analysis
            })

            const aiSummary = response.data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!aiSummary) {
                throw new Error('No AI summary returned from Gemini API')
            }

            return aiSummary
        } catch (error) {
            console.error('❌ [BuiltWith]: Failed to generate summary with Gemini:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`)
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

                console.log(`🔗 [BuiltWith]: Making OpenRouter API call (attempt ${attempt}/${maxRetries})...`)
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
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
                })

                console.log('🔍 [BuiltWith]: OpenRouter response status:', response.status)
                console.log('🔍 [BuiltWith]: OpenRouter response choices length:', response.data?.choices?.length || 0)

                const aiSummary = response.data.choices[0]?.message?.content?.trim()
                if (!aiSummary) {
                    console.error('❌ [BuiltWith]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2))
                    throw new Error('No AI summary returned from OpenRouter API')
                }

                console.log('✅ [BuiltWith]: Successfully generated summary with OpenRouter')
                return aiSummary
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                console.error(`❌ [BuiltWith]: Attempt ${attempt} failed:`, lastError.message)

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
                    console.log(`⏳ [BuiltWith]: Waiting ${delay}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        throw new Error(`OpenRouter API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
    }

    /**
     * Extract domain from email address
     * Ensures proper domain extraction for BuiltWith analysis
     */
    static extractDomainFromEmail(email: string): string | null {
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
                'mail.com', 'yandex.com', 'zoho.com'
            ]

            if (freeEmailProviders.includes(emailDomain)) {
                return null
            }

            // Remove www. prefix if present
            const cleanDomain = emailDomain.replace(/^www\./, '')

            console.log(`🔍 [BuiltWith]: Extracted clean domain: ${cleanDomain} from email: ${email}`)
            return cleanDomain

        } catch (error) {
            console.error(`❌ [BuiltWith]: Failed to extract domain from email ${email}:`, error)
            return null
        }
    }
} 