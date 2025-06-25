
const axios = require('axios')

async function testCompiledFirecrawl() {
    try {
        // Test direct API call like the service would do
        const { PrismaClient } = require('@prisma/client')
        const prisma = new PrismaClient()
        
        const config = await prisma.cOApiConfigurations.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        })

        if (!config || !config.firecrawlApiKey) {
            throw new Error('Firecrawl API key not found')
        }

        console.log('✅ API key found, testing scraping...')

        const axiosInstance = axios.create({
            baseURL: 'https://api.firecrawl.dev',
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${config.firecrawlApiKey}`,
                'Content-Type': 'application/json',
            },
        })

        const scrapePayload = {
            url: 'https://example.com',
            formats: ['markdown'],
            onlyMainContent: true,
            timeout: 30000
        }

        const response = await axiosInstance.post('/v1/scrape', scrapePayload)
        
        console.log('✅ Direct API test successful!')
        console.log(`📊 Status: ${response.status}`)
        console.log(`📄 Title: ${response.data?.data?.metadata?.title || 'No title'}`)
        console.log(`📝 Content length: ${response.data?.data?.content?.length || 0} chars`)
        console.log(`📋 Markdown length: ${response.data?.data?.markdown?.length || 0} chars`)

        await prisma.$disconnect()
        
    } catch (error) {
        console.error('❌ Test failed:', error.message)
        process.exit(1)
    }
}

testCompiledFirecrawl()
