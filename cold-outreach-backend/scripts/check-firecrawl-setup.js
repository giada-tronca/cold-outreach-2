const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkFirecrawlSetup() {
    try {
        console.log('🔍 Checking Firecrawl API configuration...')
        console.log('='.repeat(50))

        // Check if API key is configured
        const config = await prisma.cOApiConfigurations.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        })

        if (!config) {
            console.log('❌ No API configuration found in database')
            return
        }

        console.log('✅ Found API configuration in database:')
        console.log(`   ID: ${config.id}`)
        console.log(`   Created: ${config.createdAt}`)
        console.log(`   Active: ${config.isActive}`)

        // Check API keys
        const keys = {
            'OpenRouter': config.openrouterApiKey ? 'Configured' : 'Missing',
            'Gemini': config.geminiApiKey ? 'Configured' : 'Missing',
            'Firecrawl': config.firecrawlApiKey ? 'Configured' : 'Missing',
            'Proxycurl': config.proxycurlApiKey ? 'Configured' : 'Missing'
        }

        console.log('\n🔑 API Keys Status:')
        Object.entries(keys).forEach(([name, status]) => {
            const icon = status === 'Configured' ? '✅' : '❌'
            console.log(`   ${icon} ${name}: ${status}`)
        })

        if (config.firecrawlApiKey) {
            const keyPreview = config.firecrawlApiKey.substring(0, 10) + '...'
            console.log(`\n🔍 Firecrawl API Key Preview: ${keyPreview}`)
        }

        console.log('\n' + '='.repeat(50))
        console.log('🎉 Configuration check completed!')

    } catch (error) {
        console.error('❌ Failed to check Firecrawl setup:', error)
    } finally {
        await prisma.$disconnect()
    }
}

checkFirecrawlSetup()

module.exports = { checkFirecrawlSetup } 