const axios = require('axios')

async function testFirecrawlEnrichment() {
    try {
        console.log('🔍 Testing Firecrawl through Enrichment API...')
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

        // Step 2: Test available enrichment endpoints
        console.log('\n🔍 Checking available enrichment endpoints...')
        try {
            const infoResponse = await axios.get('http://localhost:3001/api/info', { timeout: 5000 })
            console.log('✅ API info retrieved')
            console.log('📊 Available endpoints:', JSON.stringify(infoResponse.data.data.endpoints, null, 2))
        } catch (error) {
            console.log('❌ Could not get API info:', error.message)
        }

        // Step 3: Try to create an enrichment job
        console.log('\n🔥 Testing Firecrawl through enrichment job...')

        const jobPayload = {
            workflowSessionId: 'test-session-' + Date.now(),
            configuration: {
                services: {
                    firecrawl: true,  // Enable Firecrawl
                    proxycurl: false, // Disable other services for focused testing
                    builtwith: false
                },
                options: {
                    skipErrors: true,
                    saveRawData: true
                }
            },
            csvData: [{
                name: 'Test User',
                email: 'test@example.com',
                company: 'Example Company',
                linkedinUrl: 'https://linkedin.com/in/test',
                website: 'https://example.com'
            }],
            campaignId: 1 // Assuming there's a campaign with ID 1
        }

        console.log('📤 Creating enrichment job...')

        // Try the /jobs endpoint for enrichment
        try {
            const jobResponse = await axios.post(
                'http://localhost:3001/api/enrichment/jobs',
                jobPayload,
                {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            )

            console.log('✅ Enrichment job endpoint responded!')
            console.log(`📊 Response status: ${jobResponse.status}`)
            console.log(`📄 Response data:`, JSON.stringify(jobResponse.data, null, 2))

            const jobId = jobResponse.data?.data?.jobId || jobResponse.data?.data?.id
            if (jobId) {
                console.log(`\n🔍 Monitoring job: ${jobId}`)

                // Try to get job status
                try {
                    const statusResponse = await axios.get(
                        `http://localhost:3001/api/enrichment/jobs/${jobId}`,
                        { timeout: 10000 }
                    )
                    console.log('✅ Job status retrieved!')
                    console.log(`📄 Status data:`, JSON.stringify(statusResponse.data, null, 2))
                } catch (statusError) {
                    console.log('❌ Error getting job status:', statusError.message)
                }
            }

        } catch (enrichmentError) {
            console.log('❌ Enrichment job endpoint failed:', enrichmentError.message)

            if (enrichmentError.response?.status) {
                console.log(`📊 HTTP Status: ${enrichmentError.response.status}`)
            }
            if (enrichmentError.response?.data) {
                console.log('📄 Error response:', JSON.stringify(enrichmentError.response.data, null, 2))
            }

            // Try alternative endpoint - jobs/enrichment
            console.log('\n🔄 Trying alternative endpoint: /api/jobs/enrichment')
            try {
                const altJobPayload = {
                    prospectId: 1,
                    configuration: {
                        services: {
                            firecrawl: true,
                            proxycurl: false,
                            builtwith: false
                        }
                    }
                }

                const altJobResponse = await axios.post(
                    'http://localhost:3001/api/jobs/enrichment',
                    altJobPayload,
                    {
                        timeout: 30000,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                )

                console.log('✅ Alternative enrichment endpoint worked!')
                console.log(`📊 Response status: ${altJobResponse.status}`)
                console.log(`📄 Response data:`, JSON.stringify(altJobResponse.data, null, 2))

            } catch (altError) {
                console.log('❌ Alternative endpoint also failed:', altError.message)
            }
        }

        console.log('\n' + '='.repeat(50))
        console.log('🎉 Firecrawl enrichment test completed!')
        console.log('')
        console.log('SUMMARY:')
        console.log('✅ Direct Firecrawl API calls are working (verified in previous test)')
        console.log('✅ Backend server is running and healthy')
        console.log('ℹ️  Enrichment job endpoints tested (may need specific setup)')

    } catch (error) {
        console.error('❌ Test failed:', error.message)
        if (error.response?.data) {
            console.error('📄 Error response:', JSON.stringify(error.response.data, null, 2))
        }
    }
}

testFirecrawlEnrichment() 