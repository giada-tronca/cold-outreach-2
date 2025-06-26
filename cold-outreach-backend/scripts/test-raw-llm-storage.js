const { prisma } = require('../dist/config/database');

async function testRawLlmStorage() {
    try {
        console.log('🔍 Testing raw LLM request storage...');

        // Find the most recent enriched prospect
        const recentProspect = await prisma.cOProspects.findFirst({
            where: {
                status: 'ENRICHED'
            },
            include: {
                enrichment: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (!recentProspect) {
            console.log('❌ No enriched prospects found');
            return;
        }

        console.log(`✅ Found recent enriched prospect: ${recentProspect.name} (${recentProspect.email})`);

        if (recentProspect.enrichment?.techStack) {
            console.log('✅ Raw LLM request data found in techStack column');
            console.log('📋 Raw LLM Data Structure:');

            const rawData = recentProspect.enrichment.techStack;
            console.log(`   - Timestamp: ${rawData.timestamp}`);
            console.log(`   - AI Provider: ${rawData.aiProvider}`);
            console.log(`   - LLM Model: ${rawData.llmModelId}`);
            console.log(`   - Request Types: ${Object.keys(rawData.requests || {}).join(', ')}`);

            // Show details for each request type
            Object.entries(rawData.requests || {}).forEach(([requestType, requestData]) => {
                console.log(`\n📝 ${requestType.toUpperCase()}:`);
                console.log(`   - Type: ${requestData.type}`);
                console.log(`   - Timestamp: ${requestData.timestamp}`);
                console.log(`   - AI Provider: ${requestData.aiProvider}`);
                console.log(`   - Prompt Length: ${requestData.prompt?.length || 0} characters`);

                // Show if we captured the actual API request
                if (requestData.geminiRequest) {
                    console.log(`   - ✅ Gemini API request captured`);
                    console.log(`     - Model: ${requestData.geminiRequest.model}`);
                    console.log(`     - Endpoint: ${requestData.geminiRequest.endpoint}`);
                }

                if (requestData.openrouterRequest) {
                    console.log(`   - ✅ OpenRouter API request captured`);
                    console.log(`     - Model: ${requestData.openrouterRequest.model}`);
                    console.log(`     - Endpoint: ${requestData.openrouterRequest.endpoint}`);
                }
            });

        } else {
            console.log('❌ No raw LLM request data found in techStack column');
            console.log('💡 This might be an older enrichment done before the feature was added');
        }

    } catch (error) {
        console.error('❌ Error testing raw LLM storage:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testRawLlmStorage(); 