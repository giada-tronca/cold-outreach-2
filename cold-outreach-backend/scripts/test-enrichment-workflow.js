const { PrismaClient } = require('@prisma/client')
const axios = require('axios')

const prisma = new PrismaClient()

async function testEnrichmentWorkflow() {
    try {
        console.log('🔍 Testing Enrichment Workflow with Firecrawl...')
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

        // Step 2: Create a test prospect
        console.log('\n📝 Creating test prospect...')
        const testProspect = await prisma.prospect.create({
            data: {
                name: 'Test User',
                email: 'test@example.com',
                company: 'Example Company',
                linkedinUrl: 'https://linkedin.com/in/test',
                additionalData: {
                    companyWebsite: 'https://example.com'
                }
            }
        })
        console.log(`✅ Created test prospect with ID: ${testProspect.id}`)

        // Step 3: Test company enrichment (this will use Firecrawl)
        console.log('\n🏢 Testing company enrichment with Firecrawl...')
        try {
            const response = await axios.post('http://localhost:3001/api/enrichment/enrich-prospect-company', {
                prospectId: testProspect.id,
                options: {
                    aiProvider: 'openrouter'
                }
            }, {
                timeout: 60000 // 60 second timeout for enrichment
            })

            if (response.data.success) {
                console.log('✅ Company enrichment successful!')
                console.log('📊 Enrichment results:')
                console.log(`- Prospect ID: ${response.data.prospect.id}`)
                console.log(`- Company: ${testProspect.company}`)
                console.log(`- Company Summary: ${response.data.prospect.companySummary ? 'Generated' : 'Not generated'}`)
                if (response.data.prospect.companySummary) {
                    console.log(`- Summary preview: ${response.data.prospect.companySummary.substring(0, 200)}...`)
                }
            } else {
                console.error('❌ Company enrichment failed:', response.data.message)
            }
        } catch (error) {
            console.error('❌ Company enrichment API call failed:', error.message)
            if (error.response?.data) {
                console.error('API Error:', error.response.data)
            }
        }

        // Step 4: Check enrichment data in database
        console.log('\n🔍 Checking enrichment data in database...')
        const enrichedProspect = await prisma.prospect.findUnique({
            where: { id: testProspect.id },
            include: { enrichment: true }
        })

        if (enrichedProspect?.enrichment) {
            console.log('✅ Enrichment data found in database:')
            console.log(`- Company Website: ${enrichedProspect.enrichment.companyWebsite}`)
            console.log(`- Company Summary: ${enrichedProspect.enrichment.companySummary ? 'Available' : 'Not available'}`)
            console.log(`- Model Used: ${enrichedProspect.enrichment.modelUsed}`)
            console.log(`- Status: ${enrichedProspect.enrichment.enrichmentStatus}`)
            console.log(`- Enriched At: ${enrichedProspect.enrichment.enrichedAt}`)
        } else {
            console.log('⚠️  No enrichment data found in database')
        }

        // Step 5: Clean up test data
        console.log('\n🧹 Cleaning up test data...')
        if (enrichedProspect?.enrichment) {
            await prisma.prospectEnrichment.delete({
                where: { prospectId: testProspect.id }
            })
        }
        await prisma.prospect.delete({
            where: { id: testProspect.id }
        })
        console.log('✅ Test data cleaned up')

        console.log('\n' + '='.repeat(50))
        console.log('🎉 Enrichment workflow test completed!')

    } catch (error) {
        console.error('❌ Test failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

// Run if called directly
if (require.main === module) {
    testEnrichmentWorkflow()
}

module.exports = { testEnrichmentWorkflow } 