const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Test script for OpenRouter API calls
 * Tests all the models and configurations we fixed
 */
class OpenRouterTester {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.testPrompt = 'Hello! Please respond with a brief greeting and confirm you are working correctly.';

        if (!this.apiKey) {
            console.error('❌ OPENROUTER_API_KEY not found in environment variables');
            process.exit(1);
        }

        console.log('🚀 Starting OpenRouter API Tests...');
        console.log(`🔑 Using API Key: ${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    }

    /**
     * Test OpenAI o1-mini model
     */
    async testO1Mini() {
        console.log('\n📋 Testing OpenAI o1-mini...');

        try {
            const response = await axios.post(this.baseUrl, {
                model: 'openai/o1-mini',
                messages: [
                    {
                        role: 'user',
                        content: this.testPrompt
                    }
                ]
                // Note: o1-mini doesn't support temperature or max_tokens
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                    'X-Title': 'Cold Outreach AI Test'
                },
                timeout: 60000
            });

            console.log('✅ o1-mini SUCCESS');
            console.log(`📝 Response: ${response.data.choices[0]?.message?.content?.substring(0, 100)}...`);
            console.log(`📊 Usage: ${JSON.stringify(response.data.usage)}`);

            return true;
        } catch (error) {
            console.error('❌ o1-mini FAILED:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Test Google Gemini 2.5 Pro model
     */
    async testGemini25Pro() {
        console.log('\n📋 Testing Google Gemini 2.5 Pro...');

        try {
            const response = await axios.post(this.baseUrl, {
                model: 'google/gemini-2.5-pro',
                messages: [
                    {
                        role: 'user',
                        content: this.testPrompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                    'X-Title': 'Cold Outreach AI Test'
                },
                timeout: 30000
            });

            console.log('✅ Gemini 2.5 Pro SUCCESS');
            console.log(`📝 Response: ${response.data.choices[0]?.message?.content?.substring(0, 100)}...`);
            console.log(`📊 Usage: ${JSON.stringify(response.data.usage)}`);

            return true;
        } catch (error) {
            console.error('❌ Gemini 2.5 Pro FAILED:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Test Google Gemini 2.5 Flash model
     */
    async testGemini25Flash() {
        console.log('\n📋 Testing Google Gemini 2.5 Flash...');

        try {
            const response = await axios.post(this.baseUrl, {
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'user',
                        content: this.testPrompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                    'X-Title': 'Cold Outreach AI Test'
                },
                timeout: 30000
            });

            console.log('✅ Gemini 2.5 Flash SUCCESS');
            console.log(`📝 Response: ${response.data.choices[0]?.message?.content?.substring(0, 100)}...`);
            console.log(`📊 Usage: ${JSON.stringify(response.data.usage)}`);

            return true;
        } catch (error) {
            console.error('❌ Gemini 2.5 Flash FAILED:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Test a more complex prompt similar to what we use in production
     */
    async testComplexPrompt() {
        console.log('\n📋 Testing Complex Prompt (similar to production)...');

        const complexPrompt = `
Analyze the following LinkedIn profile data and provide a brief professional summary:

Name: John Doe
Headline: Senior Software Engineer at Tech Corp
Summary: Experienced developer with 8+ years in full-stack development
Current Role: Senior Software Engineer at Tech Corp
Education: BS Computer Science at State University

Please provide a 2-3 sentence professional summary focusing on their expertise and current role.
        `.trim();

        try {
            const response = await axios.post(this.baseUrl, {
                model: 'google/gemini-2.5-flash', // Using fastest model for complex test
                messages: [
                    {
                        role: 'user',
                        content: complexPrompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                    'X-Title': 'Cold Outreach AI Test'
                },
                timeout: 30000
            });

            console.log('✅ Complex Prompt SUCCESS');
            console.log(`📝 Response: ${response.data.choices[0]?.message?.content}`);
            console.log(`📊 Usage: ${JSON.stringify(response.data.usage)}`);

            return true;
        } catch (error) {
            console.error('❌ Complex Prompt FAILED:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Test error handling with invalid model
     */
    async testErrorHandling() {
        console.log('\n📋 Testing Error Handling...');

        try {
            await axios.post(this.baseUrl, {
                model: 'invalid/model-name',
                messages: [
                    {
                        role: 'user',
                        content: this.testPrompt
                    }
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3001',
                    'X-Title': 'Cold Outreach AI Test'
                },
                timeout: 30000
            });

            console.log('❌ Error Handling FAILED: Should have thrown an error');
            return false;
        } catch (error) {
            console.log('✅ Error Handling SUCCESS: Properly caught invalid model error');
            console.log(`📝 Error: ${error.response?.data?.error?.message || error.message}`);
            return true;
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Running OpenRouter API Tests...\n');

        const results = {
            o1Mini: await this.testO1Mini(),
            gemini25Pro: await this.testGemini25Pro(),
            gemini25Flash: await this.testGemini25Flash(),
            complexPrompt: await this.testComplexPrompt(),
            errorHandling: await this.testErrorHandling()
        };

        // Summary
        console.log('\n📊 TEST RESULTS SUMMARY:');
        console.log('='.repeat(50));

        const passed = Object.values(results).filter(Boolean).length;
        const total = Object.keys(results).length;

        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
        });

        console.log('='.repeat(50));
        console.log(`🎯 Overall: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.log('🎉 All OpenRouter API fixes are working correctly!');
        } else {
            console.log('⚠️  Some tests failed. Please check the errors above.');
        }

        return results;
    }
}

// Run the tests
if (require.main === module) {
    const tester = new OpenRouterTester();
    tester.runAllTests().catch(console.error);
}

module.exports = OpenRouterTester; 