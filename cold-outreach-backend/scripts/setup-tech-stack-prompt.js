const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The tech stack prompt for BuiltWith analysis
const TECH_STACK_PROMPT = `You are a technology analyst extracting structured data from BuiltWith pages.

Analyze the BuiltWith content below and extract ALL technologies into a JSON array.
Each technology should have: name, category, and detected (always true).

Group technologies into these categories:
- JavaScript Frameworks (React, Vue, Angular, Svelte)
- Analytics (Google Analytics, Mixpanel, Adobe Analytics, Hotjar)
- CDN (CloudFlare, AWS CloudFront, Fastly, KeyCDN)
- Web Server (nginx, Apache, IIS, LiteSpeed)
- Hosting (AWS, Google Cloud, Heroku, Netlify, Vercel)
- E-commerce (Shopify, WooCommerce, Magento, BigCommerce)
- CMS (WordPress, Drupal, Webflow, Contentful)
- Marketing (HubSpot, Mailchimp, Intercom, Salesforce)
- CSS Frameworks (Bootstrap, Tailwind CSS, Foundation)
- Payment (Stripe, PayPal, Square, Razorpay)
- Database (MySQL, PostgreSQL, MongoDB, Redis)
- Security (SSL, Cloudflare Security, Let's Encrypt)
- Other (for technologies that don't fit above categories)

Rules:
1. Extract ONLY real technology names (ignore generic terms)
2. Use exact technology names (e.g., "React" not "React.js")
3. Skip duplicates and variations of the same technology
4. Focus on technologies that would be relevant for business prospects
5. If unsure about category, use "Other"

BuiltWith content to analyze:
---
\${BUILTWITH_CONTENT}
---

Return ONLY a valid JSON array with this exact format:
[
  {"name": "Technology Name", "category": "Category", "detected": true}
]`;

async function setupTechStackPrompt() {
    console.log('🛠️  Setting up tech_stack_prompt in database...\n');

    try {
        // Step 1: Check current database structure
        console.log('📋 Current CO_api_configurations table structure:');
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'CO_api_configurations' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `;

        console.log('   Existing columns:');
        columns.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
            const defaultVal = col.column_default ? ` default: ${col.column_default}` : '';
            console.log(`      - ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
        });

        // Step 2: Check if tech_stack_prompt column exists
        const techStackColumnExists = columns.some(col => col.column_name === 'tech_stack_prompt');

        if (!techStackColumnExists) {
            console.log('\n🔧 Adding tech_stack_prompt column...');
            await prisma.$executeRaw`ALTER TABLE "CO_api_configurations" ADD COLUMN tech_stack_prompt TEXT;`;
            console.log('   ✅ tech_stack_prompt column added successfully');
        } else {
            console.log('\n✅ tech_stack_prompt column already exists');
        }

        // Step 3: Check current prompt data
        console.log('\n📊 Current prompt status:');
        const currentPrompts = await prisma.$queryRaw`
            SELECT 
                id,
                CASE WHEN linkedin_summary_prompt IS NOT NULL THEN LENGTH(linkedin_summary_prompt) ELSE 0 END as linkedin_length,
                CASE WHEN company_summary_prompt IS NOT NULL THEN LENGTH(company_summary_prompt) ELSE 0 END as company_length,
                CASE WHEN prospect_analysis_prompt IS NOT NULL THEN LENGTH(prospect_analysis_prompt) ELSE 0 END as analysis_length,
                CASE WHEN tech_stack_prompt IS NOT NULL THEN LENGTH(tech_stack_prompt) ELSE 0 END as tech_length,
                created_at
            FROM "CO_api_configurations" 
            ORDER BY created_at DESC;
        `;

        if (currentPrompts.length === 0) {
            console.log('   ❌ No CO_api_configurations records found');
            console.log('   💡 You need to create a CO_api_configurations record first');
            return;
        }

        console.log('   Current configurations:');
        currentPrompts.forEach((config, index) => {
            console.log(`   Configuration ${index + 1} (ID: ${config.id}):`);
            console.log(`      LinkedIn prompt: ${config.linkedin_length} characters`);
            console.log(`      Company prompt: ${config.company_length} characters`);
            console.log(`      Analysis prompt: ${config.analysis_length} characters`);
            console.log(`      Tech stack prompt: ${config.tech_length} characters`);
            console.log(`      Created: ${config.created_at}`);
        });

        // Step 4: Update/Insert tech stack prompt
        const latestConfig = currentPrompts[0];

        if (latestConfig.tech_length === 0) {
            console.log('\n🔧 Installing tech stack prompt...');
            await prisma.$executeRaw`
                UPDATE "CO_api_configurations" 
                SET tech_stack_prompt = ${TECH_STACK_PROMPT}
                WHERE id = ${latestConfig.id};
            `;
            console.log('   ✅ Tech stack prompt installed successfully');
        } else {
            console.log('\n♻️  Updating existing tech stack prompt...');
            await prisma.$executeRaw`
                UPDATE "CO_api_configurations" 
                SET tech_stack_prompt = ${TECH_STACK_PROMPT}
                WHERE id = ${latestConfig.id};
            `;
            console.log('   ✅ Tech stack prompt updated successfully');
        }

        // Step 5: Verify installation
        console.log('\n🔍 Verifying installation...');
        const verification = await prisma.$queryRaw`
            SELECT 
                CASE WHEN linkedin_summary_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as linkedin_status,
                CASE WHEN company_summary_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as company_status,
                CASE WHEN prospect_analysis_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as analysis_status,
                CASE WHEN tech_stack_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as tech_status,
                LENGTH(tech_stack_prompt) as tech_prompt_length
            FROM "CO_api_configurations" 
            WHERE id = ${latestConfig.id};
        `;

        if (verification.length > 0) {
            const status = verification[0];
            console.log('   📋 Final prompt status:');
            console.log(`      ✅ LinkedIn Summary: ${status.linkedin_status}`);
            console.log(`      ✅ Company Summary: ${status.company_status}`);
            console.log(`      ✅ Prospect Analysis: ${status.analysis_status}`);
            console.log(`      ✅ Tech Stack Analysis: ${status.tech_status}`);
            console.log(`      📏 Tech stack prompt length: ${status.tech_prompt_length} characters`);
        }

        // Step 6: Show sample of tech stack prompt
        console.log('\n📄 Tech stack prompt preview:');
        const promptPreview = TECH_STACK_PROMPT.slice(0, 200) + '...';
        console.log(`   "${promptPreview}"`);

        console.log('\n🎉 Tech stack prompt setup completed successfully!');
        console.log('\n📋 Database Structure Summary:');
        console.log('   Table: CO_api_configurations');
        console.log('   Prompt Columns:');
        console.log('      - linkedin_summary_prompt (TEXT) - LinkedIn profile analysis');
        console.log('      - company_summary_prompt (TEXT) - Company website analysis');
        console.log('      - prospect_analysis_prompt (TEXT) - Prospect analysis');
        console.log('      - tech_stack_prompt (TEXT) - BuiltWith tech stack analysis');

        console.log('\n🔧 API Integration:');
        console.log('   All prompts use placeholders:');
        console.log('      - LinkedIn: ${LINKEDIN_DATA}');
        console.log('      - Company: ${WEBSITE_CONTENT}');
        console.log('      - Tech Stack: ${BUILTWITH_CONTENT}');

    } catch (error) {
        console.error('❌ Error setting up tech stack prompt:', error);

        if (error.message.includes('relation "CO_api_configurations" does not exist')) {
            console.log('\n💡 The CO_api_configurations table does not exist.');
            console.log('   Please create the table first or check your database connection.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the setup
if (require.main === module) {
    setupTechStackPrompt();
}

module.exports = { setupTechStackPrompt, TECH_STACK_PROMPT }; 