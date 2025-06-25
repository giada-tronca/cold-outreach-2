const axios = require('axios')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Mock the FirecrawlService functionality for testing
async function testFirecrawlApi() {
    try {
        console.log('🔥 Testing Firecrawl API directly...')
        console.log('='.repeat(50))

        // Get API key from database
        const config = await prisma.cOApiConfigurations.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        })

        if (!config || !config.firecrawlApiKey) {
            throw new Error('Firecrawl API key not found in database')
        }

        console.log('✅ Found Firecrawl API key in database')

        // Create axios instance
        const axiosInstance = axios.create({
            baseURL: 'https://api.firecrawl.dev',
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${config.firecrawlApiKey}`,
                'Content-Type': 'application/json',
            },
        })

        // Test URL - using a simple, reliable website
        const testUrl = 'https://example.com'

        console.log(`\n1. Testing basic website scraping for: ${testUrl}`)
        console.log('-'.repeat(40))

        try {
            const startTime = Date.now()

            const scrapePayload = {
                url: testUrl,
                formats: ['markdown'],
                onlyMainContent: true,
                timeout: 30000
            }

            console.log('📤 Making Firecrawl API request...')
            const response = await axiosInstance.post('/v1/scrape', scrapePayload)
            const duration = Date.now() - startTime

            console.log('✅ Scraping successful!')
            console.log(`⏱️  Duration: ${duration}ms`)
            console.log(`📊 Response status: ${response.status}`)

            const data = response.data
            console.log(`🔍 Response success: ${data.success}`)

            if (data.success && data.data) {
                const scrapedData = data.data
                console.log(`📄 Title: ${scrapedData.metadata?.title || 'No title'}`)
                console.log(`📝 Description: ${scrapedData.metadata?.description || 'No description'}`)
                console.log(`📊 Content length: ${scrapedData.content?.length || 0} characters`)
                console.log(`📋 Markdown length: ${scrapedData.markdown?.length || 0} characters`)
                console.log(`🌐 Source URL: ${scrapedData.metadata?.sourceURL || testUrl}`)
                console.log(`📱 Status Code: ${scrapedData.metadata?.statusCode || 'Unknown'}`)

                if (scrapedData.content && scrapedData.content.length > 0) {
                    console.log('📄 Content preview (first 200 chars):')
                    console.log(scrapedData.content.substring(0, 200) + '...')
                }
            } else {
                console.error('❌ Scraping failed:', data.error || 'Unknown error')
            }

        } catch (error) {
            console.error('❌ Scraping failed:', error.message)
            if (error.response?.data) {
                console.error('📄 API Response:', JSON.stringify(error.response.data, null, 2))
            }
            if (error.response?.status) {
                console.error(`📊 HTTP Status: ${error.response.status}`)
            }
        }

        console.log(`\n2. Testing data extraction for: ${testUrl}`)
        console.log('-'.repeat(40))

        try {
            const startTime = Date.now()

            const extractPayload = {
                url: testUrl,
                formats: ['extract'],
                extract: {
                    schema: {
                        type: "object",
                        properties: {
                            company_name: { type: "string" },
                            description: { type: "string" },
                            title: { type: "string" }
                        }
                    },
                    prompt: "Extract basic company information from this website"
                }
            }

            console.log('📤 Making Firecrawl extraction request...')
            const response = await axiosInstance.post('/v1/scrape', extractPayload)
            const duration = Date.now() - startTime

            console.log('✅ Data extraction successful!')
            console.log(`⏱️  Duration: ${duration}ms`)
            console.log(`📊 Response status: ${response.status}`)

            const data = response.data
            if (data.success && data.data?.llm_extraction) {
                console.log('📊 Extracted data:')
                console.log(JSON.stringify(data.data.llm_extraction, null, 2))
            } else {
                console.log('⚠️  No extraction data returned')
                if (data.data) {
                    console.log('📄 Raw data keys:', Object.keys(data.data))
                }
            }

        } catch (error) {
            console.error('❌ Data extraction failed:', error.message)
            if (error.response?.data) {
                console.error('📄 API Response:', JSON.stringify(error.response.data, null, 2))
            }
        }

        console.log('\n' + '='.repeat(50))
        console.log('🎉 Firecrawl API test completed!')

    } catch (error) {
        console.error('❌ Test script failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testFirecrawlApi() 