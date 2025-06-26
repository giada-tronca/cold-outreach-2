const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Test script for SSE connections
 * Diagnoses why SSE connections are showing 0 connections
 */
class SSETester {
    constructor() {
        this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        this.testUserId = 'test-user-123';
        console.log('🔍 Testing SSE connections...');
        console.log(`🌐 Base URL: ${this.baseUrl}`);
    }

    /**
     * Test the main SSE endpoint
     */
    async testMainSSEEndpoint() {
        console.log('\n📡 Testing Main SSE Endpoint: /api/jobs/stream/:userId');

        try {
            const sseUrl = `${this.baseUrl}/api/jobs/stream/${this.testUserId}`;
            console.log(`🔗 Connecting to: ${sseUrl}`);

            // Note: We can't easily test SSE with axios since it's for HTTP requests
            // We'll test if the endpoint exists and responds properly
            const response = await axios.get(sseUrl, {
                timeout: 5000,
                headers: {
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                }
            });

            console.log('✅ SSE endpoint responded');
            console.log(`📊 Status: ${response.status}`);
            console.log(`📋 Headers:`, response.headers);

            return true;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.log('⚠️  SSE endpoint timeout (this is expected for SSE connections)');
                return true; // Timeout is expected for SSE
            } else if (error.response?.status === 200) {
                console.log('✅ SSE endpoint is working (connection established)');
                return true;
            } else {
                console.error('❌ SSE endpoint failed:', error.message);
                if (error.response) {
                    console.error(`📊 Status: ${error.response.status}`);
                    console.error(`📋 Data:`, error.response.data);
                }
                return false;
            }
        }
    }

    /**
     * Test job-specific SSE endpoints
     */
    async testJobSSEEndpoints() {
        console.log('\n📡 Testing Job-Specific SSE Endpoints...');

        const testJobId = 'test-job-123';
        const endpoints = [
            `/api/enrichment/jobs/${testJobId}/progress`,
            `/api/email-generation/jobs/${testJobId}/progress`
        ];

        const results = {};

        for (const endpoint of endpoints) {
            try {
                const sseUrl = `${this.baseUrl}${endpoint}`;
                console.log(`🔗 Testing: ${sseUrl}`);

                const response = await axios.get(sseUrl, {
                    timeout: 3000,
                    headers: {
                        'Accept': 'text/event-stream',
                        'Cache-Control': 'no-cache'
                    }
                });

                results[endpoint] = 'SUCCESS';
                console.log(`✅ ${endpoint}: Working`);

            } catch (error) {
                if (error.code === 'ECONNABORTED') {
                    results[endpoint] = 'TIMEOUT_EXPECTED';
                    console.log(`⚠️  ${endpoint}: Timeout (expected for SSE)`);
                } else if (error.response?.status === 404) {
                    results[endpoint] = 'JOB_NOT_FOUND';
                    console.log(`⚠️  ${endpoint}: Job not found (expected)`);
                } else {
                    results[endpoint] = 'FAILED';
                    console.error(`❌ ${endpoint}: Failed - ${error.message}`);
                }
            }
        }

        return results;
    }

    /**
     * Test backend server connectivity
     */
    async testServerConnectivity() {
        console.log('\n🌐 Testing Backend Server Connectivity...');

        try {
            // Test basic health endpoint
            const healthUrl = `${this.baseUrl}/api/jobs/health`;
            console.log(`🔗 Testing health endpoint: ${healthUrl}`);

            const response = await axios.get(healthUrl, { timeout: 5000 });
            console.log('✅ Backend server is running');
            console.log(`📊 Health status:`, response.data);

            return true;
        } catch (error) {
            console.error('❌ Backend server connectivity failed:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.error('🚨 Backend server is not running!');
            }
            return false;
        }
    }

    /**
     * Test SSE service statistics
     */
    async testSSEStatistics() {
        console.log('\n📊 Testing SSE Service Statistics...');

        try {
            // We'll need to add a stats endpoint to the SSE service
            const statsUrl = `${this.baseUrl}/api/jobs/sse-stats`;
            console.log(`🔗 Testing SSE stats: ${statsUrl}`);

            const response = await axios.get(statsUrl, { timeout: 5000 });
            console.log('✅ SSE Statistics retrieved');
            console.log('📊 Stats:', JSON.stringify(response.data, null, 2));

            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('⚠️  SSE stats endpoint not available (need to implement)');
            } else {
                console.error('❌ SSE stats failed:', error.message);
            }
            return null;
        }
    }

    /**
     * Test CORS headers
     */
    async testCORSHeaders() {
        console.log('\n🌐 Testing CORS Headers...');

        try {
            const response = await axios.options(`${this.baseUrl}/api/jobs/stream/${this.testUserId}`, {
                headers: {
                    'Origin': 'http://localhost:3001',
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'Cache-Control'
                }
            });

            console.log('✅ CORS preflight successful');
            console.log('📋 CORS Headers:', {
                'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
                'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
                'Access-Control-Allow-Headers': response.headers['access-control-allow-headers']
            });

            return true;
        } catch (error) {
            console.error('❌ CORS test failed:', error.message);
            return false;
        }
    }

    /**
     * Run all SSE tests
     */
    async runAllTests() {
        console.log('🧪 Running SSE Connection Tests...\n');

        const results = {
            serverConnectivity: await this.testServerConnectivity(),
            mainSSEEndpoint: await this.testMainSSEEndpoint(),
            jobSSEEndpoints: await this.testJobSSEEndpoints(),
            sseStatistics: await this.testSSEStatistics(),
            corsHeaders: await this.testCORSHeaders()
        };

        // Summary
        console.log('\n📊 SSE TEST RESULTS SUMMARY:');
        console.log('='.repeat(50));

        console.log(`🌐 Server Connectivity: ${results.serverConnectivity ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`📡 Main SSE Endpoint: ${results.mainSSEEndpoint ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`🔗 Job SSE Endpoints: ${Object.values(results.jobSSEEndpoints).every(r => r !== 'FAILED') ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`📊 SSE Statistics: ${results.sseStatistics ? '✅ AVAILABLE' : '⚠️  NOT AVAILABLE'}`);
        console.log(`🌐 CORS Headers: ${results.corsHeaders ? '✅ PASS' : '❌ FAIL'}`);

        console.log('='.repeat(50));

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');

        if (!results.serverConnectivity) {
            console.log('🚨 Start the backend server first!');
        }

        if (!results.mainSSEEndpoint) {
            console.log('🔧 Check SSE route configuration in /api/jobs/stream/:userId');
        }

        if (!results.sseStatistics) {
            console.log('🔧 Add SSE statistics endpoint for better debugging');
        }

        if (!results.corsHeaders) {
            console.log('🔧 Fix CORS configuration for SSE endpoints');
        }

        console.log('\n🔍 DEBUGGING TIPS:');
        console.log('1. Check if frontend is connecting to the right SSE endpoints');
        console.log('2. Verify userId is being passed correctly to SSE endpoints');
        console.log('3. Check browser Network tab for SSE connection attempts');
        console.log('4. Look for "Connection established" logs in backend');
        console.log('5. Ensure no proxy/firewall blocking SSE connections');

        return results;
    }
}

// Run the tests
if (require.main === module) {
    const tester = new SSETester();
    tester.runAllTests().catch(console.error);
}

module.exports = SSETester; 