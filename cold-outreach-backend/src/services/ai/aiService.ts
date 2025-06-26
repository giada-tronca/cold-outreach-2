import axios from 'axios'
import { ApiConfigurationService } from '@/services/enrichment/apiConfigurationService'

export interface AIGenerationResult {
    content: string
    tokensUsed?: number
    model?: string
    finishReason?: string
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
        reasoningTokens: number
    }
}

export class AIService {
    /**
     * Generate content using specified AI provider with model selection
     */
    static async generateContent(
        prompt: string,
        aiProvider: 'gemini' | 'openrouter',
        options: {
            maxTokens?: number
            temperature?: number
            timeout?: number
            specificModel?: string // Add specific model selection
        } = {}
    ): Promise<AIGenerationResult> {
        const defaultOptions = {
            maxTokens: 1000,
            temperature: 0.7,
            timeout: 30000,
            ...options
        }

        switch (aiProvider) {
            case 'gemini':
                return this.generateWithGemini(prompt, defaultOptions)
            case 'openrouter':
                return this.generateWithOpenRouter(prompt, defaultOptions)
            default:
                throw new Error(`Unsupported AI provider: ${aiProvider}`)
        }
    }

    /**
     * Generate content using Google Gemini
     */
    private static async generateWithGemini(
        prompt: string,
        options: { maxTokens: number; temperature: number; timeout: number }
    ): Promise<AIGenerationResult> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('geminiApiKey')
            if (!apiKey) {
                throw new Error('Gemini API key not configured')
            }

            console.log(`🤖 [AIService]: Generating content with Gemini (${options.maxTokens} tokens max)`)

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
                {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: options.temperature,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: options.maxTokens,
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: options.timeout
                }
            )

            const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!content) {
                throw new Error('No content returned from Gemini API')
            }

            console.log(`✅ [AIService]: Gemini generation successful (${content.length} chars)`)

            return {
                content: content.trim(),
                model: 'gemini-2.0-flash-exp',
                tokensUsed: response.data.usageMetadata?.totalTokenCount
            }
        } catch (error) {
            console.error('❌ [AIService]: Gemini generation failed:', error)
            throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Generate content using OpenRouter with model selection
     */
    private static async generateWithOpenRouter(
        prompt: string,
        options: { maxTokens: number; temperature: number; timeout: number; specificModel?: string }
    ): Promise<AIGenerationResult> {
        try {
            const apiKey = await ApiConfigurationService.getApiKey('openrouterApiKey')
            if (!apiKey) {
                throw new Error('OpenRouter API key not configured')
            }

            // Require specific model - NO DEFAULT FALLBACK
            if (!options.specificModel) {
                throw new Error('OpenRouter requires explicit model selection. No default model available.')
            }

            let modelId: string;
            let modelName: string;
            let requestBody: any = {};

            switch (options.specificModel) {
                case 'openrouter-o1-mini':
                    modelId = 'openai/o1-mini';
                    modelName = 'o1-mini';
                    // o1-mini doesn't support temperature or max_tokens
                    requestBody = {
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    };
                    break;

                case 'openrouter-gemini-2.5-pro':
                    modelId = 'google/gemini-2.5-pro';
                    modelName = 'gemini-2.5-pro';
                    requestBody = {
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: options.maxTokens,
                        temperature: options.temperature
                    };
                    break;

                case 'openrouter-gemini-2.5-flash':
                    modelId = 'google/gemini-2.5-flash';
                    modelName = 'gemini-2.5-flash';
                    requestBody = {
                        model: modelId,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }],
                        max_tokens: options.maxTokens,
                        temperature: options.temperature
                    };
                    break;

                default:
                    throw new Error(`Unknown or unsupported model: '${options.specificModel}'. Supported models: openrouter-o1-mini, openrouter-gemini-2.5-pro, openrouter-gemini-2.5-flash`);
            }

            console.log(`🤖 [AIService]: Generating content with OpenRouter ${modelName} (${options.maxTokens} tokens max)`)
            console.log(`🔍 [AIService]: Request config: maxTokens=${options.maxTokens}, temperature=${options.temperature}`)
            console.log(`🔍 [AIService]: Using model ID: ${modelId}`)

            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                requestBody,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                        'X-Title': 'Cold Outreach AI'
                    },
                    timeout: options.timeout
                }
            )

            console.log(`🔍 [AIService]: OpenRouter response status: ${response.status}`)

            const content = response.data.choices?.[0]?.message?.content
            const finishReason = response.data.choices?.[0]?.finish_reason
            const reasoningTokens = response.data.usage?.completion_tokens_details?.reasoning_tokens

            if (!content) {
                throw new Error('No content returned from OpenRouter API')
            }

            console.log(`✅ [AIService]: Generated content with OpenRouter ${modelName}`)
            console.log(`🔍 [AIService]: Finish reason: ${finishReason}`)
            if (reasoningTokens) {
                console.log(`🧠 [AIService]: Reasoning tokens used: ${reasoningTokens}`)
            }

            return {
                content: content.trim(),
                model: modelId,
                finishReason: finishReason || 'unknown',
                usage: {
                    promptTokens: response.data.usage?.prompt_tokens || 0,
                    completionTokens: response.data.usage?.completion_tokens || 0,
                    totalTokens: response.data.usage?.total_tokens || 0,
                    reasoningTokens: reasoningTokens || 0
                }
            }
        } catch (error) {
            console.error('❌ [AIService]: OpenRouter generation failed:', error)

            if (axios.isAxiosError(error) && error.response) {
                console.error('❌ [AIService]: OpenRouter API error details:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                })
            }

            throw new Error(`OpenRouter API error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    /**
     * Convert frontend LLM model ID to specific model for backend
     */
    private static convertLLMModelToSpecificModel(llmModelId?: string): string | undefined {
        if (!llmModelId) {
            console.warn('⚠️ [AIService]: No LLM model ID provided, using default openrouter-gemini-2.5-pro');
            return 'openrouter-gemini-2.5-pro'; // Changed default to more reliable model
        }

        switch (llmModelId) {
            case 'gemini-2.0-flash':
                return undefined; // Use direct Gemini API
            case 'openrouter-o1-mini':
                return 'openrouter-o1-mini';
            case 'openrouter-gemini-2.5-pro':
                return 'openrouter-gemini-2.5-pro';
            case 'openrouter-gemini-2.5-flash':
                return 'openrouter-gemini-2.5-flash';
            default:
                console.warn(`⚠️ [AIService]: Unknown LLM model ID '${llmModelId}', using default openrouter-gemini-2.5-pro`);
                return 'openrouter-gemini-2.5-pro'; // Changed default to more reliable model
        }
    }

    /**
     * Generate email subject using AI with specific model support
     */
    static async generateEmailSubject(
        subjectPrompt: string,
        prospectData: any,
        aiProvider: 'gemini' | 'openrouter',
        llmModelId?: string
    ): Promise<string> {
        const prompt = this.buildEmailSubjectPrompt(subjectPrompt, prospectData)
        const specificModel = this.convertLLMModelToSpecificModel(llmModelId);

        console.log(`📧 [AIService]: Generating email subject with provider: ${aiProvider}, model: ${llmModelId || 'default'}`);

        // Significantly increased token limits to handle O1-Mini reasoning requirements
        const result = await this.generateContent(prompt, aiProvider, {
            maxTokens: aiProvider === 'openrouter' ? 8000 : 100, // Increased from 2000 to 8000 for O1-Mini
            temperature: 0.8, // Slightly creative for variety
            timeout: 45000, // Increased timeout for reasoning models
            specificModel
        })

        return result.content
    }

    /**
     * Generate email body using AI with specific model support
     */
    static async generateEmailBody(
        emailPrompt: string,
        prospectData: any,
        aiProvider: 'gemini' | 'openrouter',
        llmModelId?: string
    ): Promise<string> {
        const prompt = this.buildEmailBodyPrompt(emailPrompt, prospectData)
        const specificModel = this.convertLLMModelToSpecificModel(llmModelId);

        console.log(`📧 [AIService]: Generating email body with provider: ${aiProvider}, model: ${llmModelId || 'default'}`);

        // Significantly increased token limits to handle O1-Mini reasoning requirements
        const result = await this.generateContent(prompt, aiProvider, {
            maxTokens: aiProvider === 'openrouter' ? 12000 : 1500, // Increased from 4000 to 12000 for O1-Mini
            temperature: 0.7, // Balanced creativity
            timeout: 90000, // Increased timeout for longer generation with reasoning
            specificModel
        })

        return result.content
    }

    /**
     * Build email subject prompt with prospect data
     */
    private static buildEmailSubjectPrompt(subjectPrompt: string, prospectData: any): string {
        const {
            name,
            company,
            position,
            enrichment
        } = prospectData

        return `Generate a compelling email subject line based on the following:

SUBJECT TEMPLATE/INSTRUCTIONS:
${subjectPrompt}

PROSPECT INFORMATION:
- Name: ${name || 'Unknown'}
- Company: ${company || 'Unknown'}
- Position: ${position || 'Unknown'}
- Company Summary: ${enrichment?.companySummary || 'Not available'}
- LinkedIn Summary: ${enrichment?.linkedinSummary || 'Not available'}

REQUIREMENTS:
- Keep the subject line under 60 characters
- Make it personalized and relevant
- Avoid spam words
- Be specific and compelling
- Return ONLY the subject line, no additional text or quotes`
    }

    /**
     * Build email body prompt with prospect data
     */
    private static buildEmailBodyPrompt(emailPrompt: string, prospectData: any): string {
        const {
            name,
            email,
            company,
            position,
            enrichment
        } = prospectData

        return `Generate a personalized email based on the following:

EMAIL GENERATION INSTRUCTIONS:
${emailPrompt}

PROSPECT INFORMATION:
- Name: ${name || 'Unknown'}
- Email: ${email || 'Unknown'}
- Company: ${company || 'Unknown'}
- Position: ${position || 'Unknown'}
- LinkedIn URL: ${prospectData.linkedinUrl || 'Not available'}

ENRICHMENT DATA:
- Company Summary: ${enrichment?.companySummary || 'Not available'}
- LinkedIn Summary: ${enrichment?.linkedinSummary || 'Not available'}
- Tech Stack Analysis: ${enrichment?.builtwithSummary || 'Not available'}
- Prospect Analysis: ${enrichment?.prospectAnalysisSummary || 'Not available'}

REQUIREMENTS:
- Write in a professional but friendly tone
- Personalize based on the prospect's role and company
- Keep the email between 100-300 words
- Include a clear call-to-action
- Make it relevant to their business needs
- Avoid being overly salesy
- Use the enrichment data to show you've done your research
- Return ONLY the email body content, no subject line or signatures`
    }
} 