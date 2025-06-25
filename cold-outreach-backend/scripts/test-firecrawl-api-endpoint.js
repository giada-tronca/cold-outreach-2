const axios = require('axios')

async function testFirecrawlEndpoint() {
    try {
        console.log('🔍 Testing Firecrawl through API endpoints...')
        console.log('='.repeat(50))

        // Step 1: Check if server is running
        console.log('🌐 Checking if backend server is running...')
        try {
            const response = await axios.get('http://localhost:3001/api/health', { timeout: 5000 })
            console.log('✅ Backend server is running')
        } catch (error) {
            console.log('❌ Backend server is not running. Please start it with: npm run dev')
            process.exit(1)
        }

        // Step 2: Test Firecrawl website scraping directly through internal API
        console.log('\n🔥 Testing Firecrawl website scraping...')
        try {
            const testUrl = 'https://example.com'
            console.log(`📤 Testing scraping: ${testUrl}`)

            // First, let's see what endpoints are available
            console.log('🔍 Available enrichment endpoints:')
            try {
                const routes = await axios.get('http://localhost:3001/api/enrichment')
                console.log('Routes response:', routes.status)
            } catch (e) {
                console.log('Direct routes call failed, continuing...')
            }

            // Test the workflow endpoint that uses Firecrawl
            console.log('\n🧪 Testing workflow endpoint that uses Firecrawl...')

            // Create test payload for workflow
            const workflowPayload = {
                workflowSessionId: 'test-session-' + Date.now(),
                configuration: {
                    services: {
                        firecrawl: true,
                        proxycurl: false,
                        builtwith: false
                    }
                },
                csvData: [{
                    name: 'Test User',
                    email: 'test@example.com',
                    company: 'Example Company',
                    website: 'https://example.com'
                }]
            }

            console.log('📤 Making workflow request...')
            const workflowResponse = await axios.post(
                'http://localhost:3001/api/enrichment/start-workflow',
                workflowPayload,
                {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )

            if (workflowResponse.data.success) {
                console.log('✅ Workflow started successfully!')
                console.log('📊 Workflow response:', workflowResponse.data)

                // Check workflow status
                const sessionId = workflowResponse.data.sessionId || workflowPayload.workflowSessionId
                console.log(`🔍 Checking status for session: ${sessionId}`)

                // Wait a bit for processing
                await new Promise(resolve => setTimeout(resolve, 5000))

                try {
                    const statusResponse = await axios.get(
                        `http://localhost:3001/api/enrichment/workflow-status/${sessionId}`
                    )
                    console.log('📊 Workflow status:', statusResponse.data)
                } catch (statusError) {
                    console.log('⚠️  Could not get workflow status:', statusError.message)
                }

            } else {
                console.error('❌ Workflow failed:', workflowResponse.data)
            }

        } catch (error) {
            console.error('❌ Workflow test failed:', error.message)
            if (error.response?.data) {
                console.error('📄 API Error Response:', JSON.stringify(error.response.data, null, 2))
            }
            if (error.response?.status) {
                console.error(`📊 HTTP Status: ${error.response.status}`)
            }
        }

        console.log('\n' + '='.repeat(50))
        console.log('🎉 Firecrawl endpoint test completed!')

    } catch (error) {
        console.error('❌ Test script failed:', error)
    }
}

// Run if called directly
if (require.main === module) {
    testFirecrawlEndpoint()
}

module.exports = { testFirecrawlEndpoint } 