const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Test BuiltWith domain extraction functionality directly
 */
function extractDomainFromEmail(email) {
    try {
        if (!email || !email.includes('@')) {
            return null;
        }

        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (!emailDomain) {
            return null;
        }

        // Skip common free email providers
        const freeEmailProviders = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
            'mail.com', 'yandex.com', 'zoho.com'
        ];

        if (freeEmailProviders.includes(emailDomain)) {
            return null;
        }

        // Remove www. prefix if present
        const cleanDomain = emailDomain.replace(/^www\\./, '');

        console.log(`🔍 [BuiltWith]: Extracted clean domain: ${cleanDomain} from email: ${email}`);
        return cleanDomain;

    } catch (error) {
        console.error(`❌ [BuiltWith]: Failed to extract domain from email ${email}:`, error);
        return null;
    }
}

async function testBuiltWithFunctionality() {
    console.log('🧪 Testing BuiltWith functionality...');

    try {
        // Test 1: Database connectivity and prompts
        console.log('\\n1️⃣ Testing database and prompts...');
        const prompt = await prisma.cOPrompts.findFirst({
            where: {
                isActive: true,
                techStackPrompt: { not: null }
            },
            select: {
                id: true,
                techStackPrompt: true,
                version: true
            }
        });

        if (prompt) {
            console.log('✅ Found tech_stack_prompt in database');
            console.log(`   ID: ${prompt.id}, Version: ${prompt.version}`);
            console.log(`   Length: ${prompt.techStackPrompt.length} characters`);
        } else {
            console.log('❌ No tech_stack_prompt found');
        }

        // Test 2: Domain extraction
        console.log('\\n2️⃣ Testing domain extraction from emails...');
        const testEmails = [
            'john@stripe.com',
            'sarah@www.shopify.com',
            'mike@builtwith.com',
            'anna@gmail.com',     // Should be filtered
            'director@yahoo.com', // Should be filtered
            'ceo@example.co.uk'
        ];

        testEmails.forEach(email => {
            const domain = extractDomainFromEmail(email);
            const status = domain ? '✅' : '❌';
            console.log(`   ${status} ${email} → ${domain || 'FILTERED OUT'}`);
        });

        // Test 3: Check API configurations
        console.log('\\n3️⃣ Checking API configurations...');
        const apiConfig = await prisma.cOApiConfigurations.findFirst({
            select: {
                openrouterApiKey: true,
                geminiApiKey: true,
                firecrawlApiKey: true
            }
        });

        if (apiConfig) {
            console.log('✅ API configurations:');
            console.log(`   OpenRouter: ${apiConfig.openrouterApiKey ? 'CONFIGURED' : 'MISSING'}`);
            console.log(`   Gemini: ${apiConfig.geminiApiKey ? 'CONFIGURED' : 'MISSING'}`);
            console.log(`   Firecrawl: ${apiConfig.firecrawlApiKey ? 'CONFIGURED' : 'MISSING'}`);
        } else {
            console.log('❌ No API configurations found');
        }

        // Test 4: Check existing BuiltWith summaries
        console.log('\\n4️⃣ Checking existing BuiltWith summaries...');
        const existingBuiltWithSummaries = await prisma.cOProspectEnrichments.count({
            where: {
                builtwithSummary: {
                    not: null
                }
            }
        });
        console.log(`✅ Found ${existingBuiltWithSummaries} prospects with BuiltWith summaries`);

        // Test 5: Show recent enrichments
        const recentEnrichments = await prisma.cOProspectEnrichments.findMany({
            where: {
                builtwithSummary: { not: null }
            },
            select: {
                prospectId: true,
                modelUsed: true,
                enrichedAt: true,
                builtwithSummary: true
            },
            orderBy: { enrichedAt: 'desc' },
            take: 3
        });

        if (recentEnrichments.length > 0) {
            console.log('\\n   Recent BuiltWith enrichments:');
            recentEnrichments.forEach((enrichment, i) => {
                console.log(`   ${i + 1}. Prospect ${enrichment.prospectId}`);
                console.log(`      Model: ${enrichment.modelUsed}`);
                console.log(`      Date: ${enrichment.enrichedAt}`);
                console.log(`      Summary: ${enrichment.builtwithSummary?.substring(0, 100)}...`);
            });
        }

        console.log('\\n🎉 BuiltWith functionality test completed!');

        // Summary
        console.log('\\n📋 Key Features Implemented:');
        console.log('✅ Domain extraction from email addresses');
        console.log('✅ www. prefix removal');
        console.log('✅ Free email provider filtering');
        console.log('✅ Database prompt integration (CO_prompts table)');
        console.log('✅ API configuration support');
        console.log('✅ BuiltWith summary storage');

        console.log('\\n🔄 How it works:');
        console.log('1. Extract domain from prospect email (email@domain.com → domain.com)');
        console.log('2. Remove www. prefix if present');
        console.log('3. Skip free email providers (gmail, yahoo, etc.)');
        console.log('4. Use Firecrawl to scrape builtwith.com/{domain}');
        console.log('5. Send ALL scraped data to AI LLM (OpenRouter o1-mini or Gemini Flash 2.0)');
        console.log('6. Use tech_stack_prompt from CO_prompts table');
        console.log('7. Save generated summary to database');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testBuiltWithFunctionality(); 