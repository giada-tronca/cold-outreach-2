import axios from 'axios'
import { ApiConfigurationService } from './apiConfigurationService'
import { AppError } from '@/utils/errors'

interface ProxycurlPersonProfile {
    public_identifier?: string
    profile_pic_url?: string
    background_cover_image_url?: string
    first_name?: string
    last_name?: string
    full_name?: string
    headline?: string
    summary?: string
    country?: string
    country_full_name?: string
    city?: string
    state?: string
    experiences?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        company?: string
        company_linkedin_profile_url?: string
        title?: string
        description?: string
        location?: string
        logo_url?: string
    }>
    education?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        field_of_study?: string
        degree_name?: string
        school?: string
        school_linkedin_profile_url?: string
        description?: string
        logo_url?: string
        grade?: string
    }>
    languages?: string[]
    accomplishment_organisations?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        org_name?: string
        title?: string
        description?: string
    }>
    accomplishment_publications?: Array<{
        name?: string
        publisher?: string
        published_on?: { day?: number; month?: number; year?: number }
        description?: string
        url?: string
    }>
    accomplishment_honors_awards?: Array<{
        title?: string
        issuer?: string
        issued_on?: { day?: number; month?: number; year?: number }
        description?: string
    }>
    accomplishment_patents?: Array<{
        title?: string
        issuer?: string
        issued_on?: { day?: number; month?: number; year?: number }
        description?: string
        application_number?: string
        patent_number?: string
        url?: string
    }>
    accomplishment_courses?: Array<{
        name?: string
        number?: string
    }>
    accomplishment_projects?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        title?: string
        description?: string
        url?: string
    }>
    accomplishment_test_scores?: Array<{
        name?: string
        score?: string
        date_on?: { day?: number; month?: number; year?: number }
        description?: string
    }>
    volunteer_work?: Array<{
        starts_at?: { day?: number; month?: number; year?: number }
        ends_at?: { day?: number; month?: number; year?: number }
        title?: string
        cause?: string
        company?: string
        company_linkedin_profile_url?: string
        description?: string
        logo_url?: string
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
    connections?: number
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
    similarly_named_profiles?: Array<{
        name?: string
        link?: string
        summary?: string
        location?: string
    }>
    articles?: Array<{
        title?: string
        link?: string
        published_date?: { day?: number; month?: number; year?: number }
        author?: string
        image_url?: string
    }>
    groups?: Array<{
        profile_pic_url?: string
        name?: string
        url?: string
    }>
}

interface ProxycurlCompanyProfile {
    linkedin_internal_id?: string
    description?: string
    website?: string
    industry?: string
    company_size?: Array<number>
    company_size_on_linkedin?: number
    hq?: {
        country?: string
        city?: string
        postal_code?: string
        line_1?: string
        is_hq?: boolean
        state?: string
    }
    company_type?: string
    founded_year?: number
    specialities?: string[]
    locations?: Array<{
        country?: string
        city?: string
        postal_code?: string
        line_1?: string
        is_hq?: boolean
        state?: string
    }>
    name?: string
    tagline?: string
    universal_name_id?: string
    profile_pic_url?: string
    background_cover_image_url?: string
    search_id?: string
    similar_companies?: Array<{
        name?: string
        link?: string
        industry?: string
        location?: string
    }>
    affiliated_companies?: Array<{
        name?: string
        link?: string
        industry?: string
        location?: string
    }>
    updates?: Array<{
        article_link?: string
        image?: string
        posted_on?: { day?: number; month?: number; year?: number }
        text?: string
        total_likes?: number
    }>
    follower_count?: number
}

export interface EnrichedPersonData {
    profileUrl?: string
    fullName?: string
    headline?: string
    summary?: string
    location?: string
    currentPosition?: {
        title?: string
        company?: string
        duration?: string
    }
    experience?: Array<{
        title?: string
        company?: string
        duration?: string
        description?: string
    }>
    education?: Array<{
        school?: string
        degree?: string
        field?: string
        duration?: string
    }>
    skills?: string[]
    connections?: number
    rawData?: ProxycurlPersonProfile
    linkedinSummary?: string
}

export interface EnrichedCompanyData {
    name?: string
    description?: string
    website?: string
    industry?: string
    size?: string
    founded?: number
    location?: string
    specialties?: string[]
    rawData?: ProxycurlCompanyProfile
}

/**
 * Proxycurl service for enriching LinkedIn profiles
 * Uses the official Proxycurl API with Bearer authentication
 */
export class ProxycurlService {
    // Updated to use the official Proxycurl API endpoint
    private static readonly BASE_URL = 'https://nubela.co/proxycurl'

    /**
     * Create axios instance with API key and default config
     * Updated to use Bearer authentication instead of RapidAPI
     */
    private static async createAxiosInstance(): Promise<any> {
        const apiKey = await ApiConfigurationService.getApiKey('proxycurlApiKey')
        const config = await ApiConfigurationService.getModelConfiguration()

        return axios.create({
            baseURL: this.BASE_URL,
            timeout: config.timeout,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        })
    }

    /**
     * Retry mechanism with exponential backoff
     */
    private static async retryRequest<T>(
        requestFn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error = new Error('Max retries exceeded')

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn()
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))

                // Don't retry on 4xx errors (except 429 rate limit)
                if (axios.isAxiosError(error) && error.response) {
                    const status = error.response.status
                    if (status >= 400 && status < 500 && status !== 429) {
                        throw error
                    }
                }

                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt)
                    console.log(`Proxycurl request failed (attempt ${attempt + 1}), retrying in ${delay}ms...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        throw lastError
    }

    /**
     * Enrich person profile by LinkedIn URL
     * Enhanced to capture ALL possible LinkedIn data
     */
    static async enrichPersonProfile(linkedinUrl: string): Promise<EnrichedPersonData> {
        try {
            console.log(`🔍 [Proxycurl]: Enriching person profile: ${linkedinUrl}`)

            const axiosInstance = await this.createAxiosInstance()
            const config = await ApiConfigurationService.getModelConfiguration()

            // Enhanced API request with ALL available parameters to get maximum data
            const response = await this.retryRequest(
                () => axiosInstance.get('/api/v2/linkedin', {
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
                        fallback_to_cache: 'on-error',
                        // Additional parameters to capture more data
                        include_contact_info: 'include',
                        include_public_identifier: 'include',
                        include_profile_picture: 'include',
                        include_background_cover: 'include',
                        include_accomplishments: 'include',
                        include_certifications: 'include',
                        include_volunteer_work: 'include',
                        include_recommendations: 'include',
                        include_activities: 'include',
                        include_people_also_viewed: 'include',
                        include_similarly_named_profiles: 'include',
                        include_articles: 'include',
                        include_groups: 'include'
                    }
                }),
                config.retryAttempts
            )

            const profile: ProxycurlPersonProfile = (response as any).data
            const creditCost = (response as any).headers['x-proxycurl-credit-cost']

            // Transform the raw data into a structured format
            const enrichedData: EnrichedPersonData = {
                profileUrl: linkedinUrl,
                fullName: profile.full_name || '',
                headline: profile.headline || '',
                summary: profile.summary || '',
                location: this.formatLocation(profile.city, profile.state, profile.country_full_name),
                currentPosition: this.extractCurrentPosition(profile.experiences),
                experience: this.formatExperiences(profile.experiences),
                education: this.formatEducation(profile.education),
                skills: profile.languages || [],
                connections: profile.connections,
                rawData: profile
            }

            console.log(`✅ [Proxycurl]: Successfully enriched person profile for ${profile.full_name} (Cost: ${creditCost} credits)`)

            // Generate LinkedIn summary using AI with ALL captured data
            const linkedinSummary = await this.generateLinkedInSummaryWithAI(profile)
            enrichedData.linkedinSummary = linkedinSummary

            return enrichedData

        } catch (error) {
            console.error(`❌ [Proxycurl]: Failed to enrich person profile ${linkedinUrl}:`, error)

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status
                const message = error.response.data?.message || error.message
                throw new AppError(`Proxycurl API error (${status}): ${message}`)
            }

            throw new AppError(`Proxycurl enrichment failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate LinkedIn summary using AI with comprehensive data from Proxycurl
     * Uses database prompt from CO_prompts table
     */
    private static async generateLinkedInSummaryWithAI(profileData: ProxycurlPersonProfile): Promise<string> {
        try {
            console.log(`🤖 [Proxycurl]: Generating LinkedIn summary using AI with comprehensive data`)

            // Get the LinkedIn summary prompt from database
            const prompt = await ApiConfigurationService.getPrompt('linkedin_summary_prompt')

            // Format ALL LinkedIn data for AI processing
            const comprehensiveLinkedInData = this.formatAllLinkedInDataForAI(profileData)

            // Replace placeholder with comprehensive data
            const finalPrompt = prompt.replace('{linkedin_data_placeholder}', comprehensiveLinkedInData)

            // Use OpenRouter as default (can be made configurable)
            const aiProvider = 'openrouter'
            const summary = await this.generateSummaryWithAI(finalPrompt, aiProvider)

            console.log(`✅ [Proxycurl]: Generated comprehensive LinkedIn summary using database prompt`)
            return summary

        } catch (error) {
            console.error('❌ [Proxycurl]: Failed to generate LinkedIn summary:', error)
            return 'LinkedIn summary generation failed'
        }
    }

    /**
     * Format ALL available LinkedIn data for AI processing
     * This ensures no data is missed and AI gets complete picture
     */
    private static formatAllLinkedInDataForAI(profile: ProxycurlPersonProfile): string {
        const sections: string[] = []

        // === BASIC INFORMATION ===
        sections.push('=== BASIC INFORMATION ===')
        if (profile.full_name) sections.push(`Name: ${profile.full_name}`)
        if (profile.first_name) sections.push(`First Name: ${profile.first_name}`)
        if (profile.last_name) sections.push(`Last Name: ${profile.last_name}`)
        if (profile.headline) sections.push(`Professional Headline: ${profile.headline}`)
        if (profile.public_identifier) sections.push(`LinkedIn ID: ${profile.public_identifier}`)

        // === LOCATION ===
        if (profile.city || profile.state || profile.country || profile.country_full_name) {
            sections.push('\n=== LOCATION ===')
            if (profile.city) sections.push(`City: ${profile.city}`)
            if (profile.state) sections.push(`State: ${profile.state}`)
            if (profile.country) sections.push(`Country: ${profile.country}`)
            if (profile.country_full_name) sections.push(`Country Full: ${profile.country_full_name}`)
        }

        // === PROFESSIONAL SUMMARY ===
        if (profile.summary) {
            sections.push('\n=== PROFESSIONAL SUMMARY ===')
            sections.push(profile.summary)
        }

        // === WORK EXPERIENCE ===
        if (profile.experiences && profile.experiences.length > 0) {
            sections.push('\n=== WORK EXPERIENCE ===')
            profile.experiences.forEach((exp, index) => {
                sections.push(`\nExperience ${index + 1}:`)
                if (exp.title) sections.push(`  Title: ${exp.title}`)
                if (exp.company) sections.push(`  Company: ${exp.company}`)
                if (exp.company_linkedin_profile_url) sections.push(`  Company LinkedIn: ${exp.company_linkedin_profile_url}`)
                if (exp.location) sections.push(`  Location: ${exp.location}`)

                // Format dates
                const startDate = exp.starts_at ? this.formatDate(exp.starts_at) : null
                const endDate = exp.ends_at ? this.formatDate(exp.ends_at) : 'Present'
                if (startDate) sections.push(`  Duration: ${startDate} - ${endDate}`)

                if (exp.description) sections.push(`  Description: ${exp.description}`)
            })
        }

        // === EDUCATION ===
        if (profile.education && profile.education.length > 0) {
            sections.push('\n=== EDUCATION ===')
            profile.education.forEach((edu, index) => {
                sections.push(`\nEducation ${index + 1}:`)
                if (edu.school) sections.push(`  School: ${edu.school}`)
                if (edu.degree_name) sections.push(`  Degree: ${edu.degree_name}`)
                if (edu.field_of_study) sections.push(`  Field of Study: ${edu.field_of_study}`)
                if (edu.grade) sections.push(`  Grade: ${edu.grade}`)
                if (edu.school_linkedin_profile_url) sections.push(`  School LinkedIn: ${edu.school_linkedin_profile_url}`)

                const startDate = edu.starts_at ? this.formatDate(edu.starts_at) : null
                const endDate = edu.ends_at ? this.formatDate(edu.ends_at) : 'Present'
                if (startDate) sections.push(`  Duration: ${startDate} - ${endDate}`)

                if (edu.description) sections.push(`  Description: ${edu.description}`)
            })
        }

        // === LANGUAGES ===
        if (profile.languages && profile.languages.length > 0) {
            sections.push('\n=== LANGUAGES ===')
            sections.push(`Languages: ${profile.languages.join(', ')}`)
        }

        // === CERTIFICATIONS ===
        if (profile.certifications && profile.certifications.length > 0) {
            sections.push('\n=== CERTIFICATIONS ===')
            profile.certifications.forEach((cert, index) => {
                sections.push(`\nCertification ${index + 1}:`)
                if (cert.name) sections.push(`  Name: ${cert.name}`)
                if (cert.authority) sections.push(`  Authority: ${cert.authority}`)
                if (cert.license_number) sections.push(`  License Number: ${cert.license_number}`)
                if (cert.url) sections.push(`  URL: ${cert.url}`)

                const startDate = cert.starts_at ? this.formatDate(cert.starts_at) : null
                const endDate = cert.ends_at ? this.formatDate(cert.ends_at) : 'No Expiry'
                if (startDate) sections.push(`  Valid: ${startDate} - ${endDate}`)
            })
        }

        // === ACCOMPLISHMENTS - ORGANIZATIONS ===
        if (profile.accomplishment_organisations && profile.accomplishment_organisations.length > 0) {
            sections.push('\n=== ORGANIZATIONAL ACCOMPLISHMENTS ===')
            profile.accomplishment_organisations.forEach((org, index) => {
                sections.push(`\nOrganization ${index + 1}:`)
                if (org.org_name) sections.push(`  Organization: ${org.org_name}`)
                if (org.title) sections.push(`  Title: ${org.title}`)
                if (org.description) sections.push(`  Description: ${org.description}`)

                const startDate = org.starts_at ? this.formatDate(org.starts_at) : null
                const endDate = org.ends_at ? this.formatDate(org.ends_at) : 'Present'
                if (startDate) sections.push(`  Duration: ${startDate} - ${endDate}`)
            })
        }

        // === ACCOMPLISHMENTS - PUBLICATIONS ===
        if (profile.accomplishment_publications && profile.accomplishment_publications.length > 0) {
            sections.push('\n=== PUBLICATIONS ===')
            profile.accomplishment_publications.forEach((pub, index) => {
                sections.push(`\nPublication ${index + 1}:`)
                if (pub.name) sections.push(`  Title: ${pub.name}`)
                if (pub.publisher) sections.push(`  Publisher: ${pub.publisher}`)
                if (pub.url) sections.push(`  URL: ${pub.url}`)
                if (pub.description) sections.push(`  Description: ${pub.description}`)

                const pubDate = pub.published_on ? this.formatDate(pub.published_on) : null
                if (pubDate) sections.push(`  Published: ${pubDate}`)
            })
        }

        // === ACCOMPLISHMENTS - HONORS & AWARDS ===
        if (profile.accomplishment_honors_awards && profile.accomplishment_honors_awards.length > 0) {
            sections.push('\n=== HONORS & AWARDS ===')
            profile.accomplishment_honors_awards.forEach((award, index) => {
                sections.push(`\nAward ${index + 1}:`)
                if (award.title) sections.push(`  Title: ${award.title}`)
                if (award.issuer) sections.push(`  Issuer: ${award.issuer}`)
                if (award.description) sections.push(`  Description: ${award.description}`)

                const issueDate = award.issued_on ? this.formatDate(award.issued_on) : null
                if (issueDate) sections.push(`  Issued: ${issueDate}`)
            })
        }

        // === ACCOMPLISHMENTS - PATENTS ===
        if (profile.accomplishment_patents && profile.accomplishment_patents.length > 0) {
            sections.push('\n=== PATENTS ===')
            profile.accomplishment_patents.forEach((patent, index) => {
                sections.push(`\nPatent ${index + 1}:`)
                if (patent.title) sections.push(`  Title: ${patent.title}`)
                if (patent.issuer) sections.push(`  Issuer: ${patent.issuer}`)
                if (patent.patent_number) sections.push(`  Patent Number: ${patent.patent_number}`)
                if (patent.application_number) sections.push(`  Application Number: ${patent.application_number}`)
                if (patent.url) sections.push(`  URL: ${patent.url}`)
                if (patent.description) sections.push(`  Description: ${patent.description}`)

                const issueDate = patent.issued_on ? this.formatDate(patent.issued_on) : null
                if (issueDate) sections.push(`  Issued: ${issueDate}`)
            })
        }

        // === ACCOMPLISHMENTS - COURSES ===
        if (profile.accomplishment_courses && profile.accomplishment_courses.length > 0) {
            sections.push('\n=== COURSES ===')
            profile.accomplishment_courses.forEach((course, index) => {
                sections.push(`\nCourse ${index + 1}:`)
                if (course.name) sections.push(`  Name: ${course.name}`)
                if (course.number) sections.push(`  Course Number: ${course.number}`)
            })
        }

        // === ACCOMPLISHMENTS - PROJECTS ===
        if (profile.accomplishment_projects && profile.accomplishment_projects.length > 0) {
            sections.push('\n=== PROJECTS ===')
            profile.accomplishment_projects.forEach((project, index) => {
                sections.push(`\nProject ${index + 1}:`)
                if (project.title) sections.push(`  Title: ${project.title}`)
                if (project.url) sections.push(`  URL: ${project.url}`)
                if (project.description) sections.push(`  Description: ${project.description}`)

                const startDate = project.starts_at ? this.formatDate(project.starts_at) : null
                const endDate = project.ends_at ? this.formatDate(project.ends_at) : 'Present'
                if (startDate) sections.push(`  Duration: ${startDate} - ${endDate}`)
            })
        }

        // === ACCOMPLISHMENTS - TEST SCORES ===
        if (profile.accomplishment_test_scores && profile.accomplishment_test_scores.length > 0) {
            sections.push('\n=== TEST SCORES ===')
            profile.accomplishment_test_scores.forEach((test, index) => {
                sections.push(`\nTest ${index + 1}:`)
                if (test.name) sections.push(`  Test: ${test.name}`)
                if (test.score) sections.push(`  Score: ${test.score}`)
                if (test.description) sections.push(`  Description: ${test.description}`)

                const testDate = test.date_on ? this.formatDate(test.date_on) : null
                if (testDate) sections.push(`  Date: ${testDate}`)
            })
        }

        // === VOLUNTEER WORK ===
        if (profile.volunteer_work && profile.volunteer_work.length > 0) {
            sections.push('\n=== VOLUNTEER WORK ===')
            profile.volunteer_work.forEach((vol, index) => {
                sections.push(`\nVolunteer Work ${index + 1}:`)
                if (vol.title) sections.push(`  Title: ${vol.title}`)
                if (vol.company) sections.push(`  Organization: ${vol.company}`)
                if (vol.cause) sections.push(`  Cause: ${vol.cause}`)
                if (vol.description) sections.push(`  Description: ${vol.description}`)

                const startDate = vol.starts_at ? this.formatDate(vol.starts_at) : null
                const endDate = vol.ends_at ? this.formatDate(vol.ends_at) : 'Present'
                if (startDate) sections.push(`  Duration: ${startDate} - ${endDate}`)
            })
        }

        // === ADDITIONAL INFORMATION ===
        if (profile.connections) {
            sections.push('\n=== NETWORK ===')
            sections.push(`LinkedIn Connections: ${profile.connections}`)
        }

        // === RECOMMENDATIONS ===
        if (profile.recommendations && profile.recommendations.length > 0) {
            sections.push('\n=== RECOMMENDATIONS ===')
            profile.recommendations.forEach((rec, index) => {
                sections.push(`Recommendation ${index + 1}: ${rec}`)
            })
        }

        // === ACTIVITIES ===
        if (profile.activities && profile.activities.length > 0) {
            sections.push('\n=== RECENT ACTIVITIES ===')
            profile.activities.forEach((activity, index) => {
                sections.push(`\nActivity ${index + 1}:`)
                if (activity.title) sections.push(`  Title: ${activity.title}`)
                if (activity.link) sections.push(`  Link: ${activity.link}`)
                if (activity.activity_status) sections.push(`  Status: ${activity.activity_status}`)
            })
        }

        // === ARTICLES ===
        if (profile.articles && profile.articles.length > 0) {
            sections.push('\n=== PUBLISHED ARTICLES ===')
            profile.articles.forEach((article, index) => {
                sections.push(`\nArticle ${index + 1}:`)
                if (article.title) sections.push(`  Title: ${article.title}`)
                if (article.link) sections.push(`  Link: ${article.link}`)
                if (article.author) sections.push(`  Author: ${article.author}`)

                const pubDate = article.published_date ? this.formatDate(article.published_date) : null
                if (pubDate) sections.push(`  Published: ${pubDate}`)
            })
        }

        // === GROUPS ===
        if (profile.groups && profile.groups.length > 0) {
            sections.push('\n=== LINKEDIN GROUPS ===')
            profile.groups.forEach((group, index) => {
                sections.push(`\nGroup ${index + 1}:`)
                if (group.name) sections.push(`  Name: ${group.name}`)
                if (group.url) sections.push(`  URL: ${group.url}`)
            })
        }

        return sections.join('\n')
    }

    /**
     * Generate summary using AI (supports both Gemini and OpenRouter)
     */
    private static async generateSummaryWithAI(prompt: string, aiProvider: 'gemini' | 'openrouter'): Promise<string> {
        try {
            if (aiProvider === 'gemini') {
                return await this.generateSummaryWithGemini(prompt)
            } else {
                return await this.generateSummaryWithOpenRouter(prompt)
            }
        } catch (error) {
            console.error(`Failed to generate summary with ${aiProvider}:`, error)
            throw error
        }
    }

    /**
     * Generate summary using Google Gemini
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
                    maxOutputTokens: 800, // Increased for comprehensive summaries
                }
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 45000 // Increased timeout for comprehensive data processing
            })

            const aiSummary = response.data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!aiSummary) {
                throw new Error('No AI summary returned from Gemini API')
            }

            return aiSummary
        } catch (error) {
            console.error('Failed to generate summary with Gemini:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate summary using OpenRouter with retry logic
     */
    private static async generateSummaryWithOpenRouter(prompt: string): Promise<string> {
        const maxRetries = 3
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')

                console.log(`🔗 [Proxycurl]: Making OpenRouter API call (attempt ${attempt}/${maxRetries})...`)
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
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
                    timeout: 120000 // Increased from 90s to 120s for O1-Mini reasoning
                })

                console.log('🔍 [Proxycurl]: OpenRouter response status:', response.status)
                console.log('🔍 [Proxycurl]: OpenRouter response choices length:', response.data?.choices?.length || 0)

                const aiSummary = response.data.choices[0]?.message?.content?.trim()
                if (!aiSummary) {
                    console.error('❌ [Proxycurl]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2))
                    throw new Error('No AI summary returned from OpenRouter API')
                }

                console.log('✅ [Proxycurl]: Successfully generated summary with OpenRouter')
                return aiSummary
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                console.error(`❌ [Proxycurl]: Attempt ${attempt} failed:`, lastError.message)

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
                    console.log(`⏳ [Proxycurl]: Waiting ${delay}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        throw new Error(`OpenRouter API failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
    }

    /**
     * Enrich company profile by LinkedIn URL
     * Updated to use the correct company endpoint
     */
    static async enrichCompanyProfile(companyLinkedinUrl: string): Promise<EnrichedCompanyData> {
        try {
            console.log(`🔍 [Proxycurl]: Enriching company profile: ${companyLinkedinUrl}`)

            const axiosInstance = await this.createAxiosInstance()
            const config = await ApiConfigurationService.getModelConfiguration()

            const response = await this.retryRequest(
                () => axiosInstance.get('/api/linkedin/company', {
                    params: {
                        url: companyLinkedinUrl,
                        categories: 'include',
                        funding_data: 'include',
                        exit_data: 'include',
                        acquisitions: 'include',
                        extra: 'include',
                        use_cache: 'if-present',
                        fallback_to_cache: 'on-error'
                    }
                }),
                config.retryAttempts
            )

            const company: ProxycurlCompanyProfile = (response as any).data
            const creditCost = (response as any).headers['x-proxycurl-credit-cost']

            const enrichedData: EnrichedCompanyData = {
                name: company.name,
                description: company.description,
                website: company.website,
                industry: company.industry,
                size: this.formatCompanySize(company.company_size),
                founded: company.founded_year,
                location: this.formatCompanyLocation(company.hq),
                specialties: company.specialities,
                rawData: company
            }

            console.log(`✅ [Proxycurl]: Successfully enriched company profile for ${company.name} (Cost: ${creditCost} credits)`)
            return enrichedData

        } catch (error) {
            console.error(`❌ [Proxycurl]: Failed to enrich company profile ${companyLinkedinUrl}:`, error)

            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status
                const message = error.response.data?.message || error.message
                throw new AppError(`Proxycurl API error (${status}): ${message}`)
            }

            throw new AppError(`Proxycurl company enrichment failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Format location string
     */
    private static formatLocation(city?: string, state?: string, country?: string): string | undefined {
        const parts = [city, state, country].filter(Boolean)
        return parts.length > 0 ? parts.join(', ') : undefined
    }

    /**
     * Extract current position from experiences
     */
    private static extractCurrentPosition(experiences?: ProxycurlPersonProfile['experiences']): EnrichedPersonData['currentPosition'] {
        if (!experiences || experiences.length === 0) return undefined

        // Find current position (no end date)
        const currentExp = experiences.find(exp => !exp.ends_at) || experiences[0]
        if (!currentExp) return undefined

        return {
            title: currentExp.title,
            company: currentExp.company,
            duration: this.formatDuration(currentExp.starts_at, currentExp.ends_at)
        }
    }

    /**
     * Format experiences array
     */
    private static formatExperiences(experiences?: ProxycurlPersonProfile['experiences']): EnrichedPersonData['experience'] {
        if (!experiences) return undefined

        return experiences.slice(0, 5).map(exp => ({
            title: exp.title,
            company: exp.company,
            duration: this.formatDuration(exp.starts_at, exp.ends_at),
            description: exp.description
        }))
    }

    /**
     * Format education array
     */
    private static formatEducation(education?: ProxycurlPersonProfile['education']): EnrichedPersonData['education'] {
        if (!education) return undefined

        return education.slice(0, 3).map(edu => ({
            school: edu.school,
            degree: edu.degree_name,
            field: edu.field_of_study,
            duration: this.formatDuration(edu.starts_at, edu.ends_at)
        }))
    }

    /**
     * Format duration from date objects
     */
    private static formatDuration(
        startDate?: { day?: number; month?: number; year?: number },
        endDate?: { day?: number; month?: number; year?: number }
    ): string | undefined {
        if (!startDate) return undefined

        const start = this.formatDate(startDate)
        const end = endDate ? this.formatDate(endDate) : 'Present'

        return `${start} - ${end}`
    }

    /**
     * Format date object to string
     */
    private static formatDate(date: { day?: number; month?: number; year?: number }): string {
        if (date.year && date.month) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return `${monthNames[date.month - 1]} ${date.year}`
        }
        return date.year?.toString() || 'Unknown'
    }

    /**
     * Format company size
     */
    private static formatCompanySize(size?: Array<number>): string | undefined {
        if (!size || size.length < 2) return undefined
        return `${size[0]}-${size[1]} employees`
    }

    /**
     * Format company location
     */
    private static formatCompanyLocation(hq?: ProxycurlCompanyProfile['hq']): string | undefined {
        if (!hq) return undefined
        const parts = [hq.city, hq.state, hq.country].filter(Boolean)
        return parts.length > 0 ? parts.join(', ') : undefined
    }
} 