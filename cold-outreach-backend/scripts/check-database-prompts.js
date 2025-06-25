const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabasePrompts() {
    console.log('🔍 Checking AI prompts stored in database...\n');

    try {
        // First, let's see what tables actually exist
        console.log('📋 Checking what tables exist in the database...');

        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;

        console.log('✅ Available tables:');
        tables.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        console.log('');

        // Check if CO_api_configurations table exists and what columns it has
        if (tables.some(t => t.table_name === 'CO_api_configurations')) {
            console.log('📊 CO_api_configurations table columns:');
            const columns = await prisma.$queryRaw`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'CO_api_configurations' 
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            `;

            columns.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
            });
            console.log('');

            // Check for specific prompts (with graceful handling for missing columns)
            console.log('🔍 Checking for AI prompts...');

            try {
                const promptsCheck = await prisma.$queryRaw`
                    SELECT 
                        CASE WHEN linkedin_summary_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as linkedin_summary_prompt,
                        CASE WHEN company_summary_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as company_summary_prompt,
                        CASE WHEN prospect_analysis_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as prospect_analysis_prompt
                    FROM "CO_api_configurations" 
                    ORDER BY created_at DESC 
                    LIMIT 1
                `;

                if (promptsCheck.length > 0) {
                    const prompts = promptsCheck[0];
                    console.log('   📋 Prompt availability:');
                    console.log(`      ✅ LinkedIn Summary: ${prompts.linkedin_summary_prompt}`);
                    console.log(`      ✅ Company Summary: ${prompts.company_summary_prompt}`);
                    console.log(`      ✅ Prospect Analysis: ${prompts.prospect_analysis_prompt}`);

                    // Check for tech_stack_prompt separately
                    try {
                        const techStackCheck = await prisma.$queryRaw`
                            SELECT 
                                CASE WHEN tech_stack_prompt IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as tech_stack_prompt
                            FROM "CO_api_configurations" 
                            ORDER BY created_at DESC 
                            LIMIT 1
                        `;

                        if (techStackCheck.length > 0) {
                            console.log(`      ✅ Tech Stack Analysis: ${techStackCheck[0].tech_stack_prompt}`);
                        }
                    } catch (error) {
                        console.log(`      ❌ Tech Stack Analysis: COLUMN_NOT_EXISTS (need to add tech_stack_prompt column)`);
                        console.log('         💡 Run this SQL to add the column:');
                        console.log('         ALTER TABLE CO_api_configurations ADD COLUMN tech_stack_prompt TEXT;');
                    }

                    // Check lengths
                    const promptLengths = await prisma.$queryRaw`
                        SELECT 
                            LENGTH(linkedin_summary_prompt) as linkedin_length,
                            LENGTH(company_summary_prompt) as company_length,
                            LENGTH(prospect_analysis_prompt) as analysis_length
                        FROM "CO_api_configurations" 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    `;

                    if (promptLengths.length > 0) {
                        const lengths = promptLengths[0];
                        console.log('   📏 Prompt lengths:');
                        console.log(`      LinkedIn Summary: ${lengths.linkedin_length || 0} characters`);
                        console.log(`      Company Summary: ${lengths.company_length || 0} characters`);
                        console.log(`      Prospect Analysis: ${lengths.analysis_length || 0} characters`);
                    }
                }
            } catch (error) {
                console.log('   ❌ Error checking prompts:', error.message);
            }

            // Get sample data
            const apiConfigData = await prisma.$queryRaw`SELECT * FROM "CO_api_configurations" LIMIT 1;`;
            console.log('\n📋 Sample configuration data:');
            if (apiConfigData.length > 0) {
                const config = apiConfigData[0];
                console.log(`   ID: ${config.id}`);
                console.log(`   Created: ${config.created_at}`);
                console.log(`   Has LinkedIn prompt: ${config.linkedin_summary_prompt ? 'Yes' : 'No'}`);
                console.log(`   Has Company prompt: ${config.company_summary_prompt ? 'Yes' : 'No'}`);
                console.log(`   Has Tech Stack prompt: ${config.tech_stack_prompt ? 'Yes' : 'No'}`);
            }
        }

        // Check campaigns table for prompts
        if (tables.some(t => t.table_name === 'CO_campaigns')) {
            console.log('\n📋 Checking CO_campaigns table for prompts...');
            const campaignColumns = await prisma.$queryRaw`
                SELECT column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = 'CO_campaigns' 
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            `;

            console.log('Campaigns table columns:');
            campaignColumns.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });

            const campaigns = await prisma.$queryRaw`
                SELECT id, name, prompt 
                FROM "CO_campaigns" 
                LIMIT 3;
            `;

            if (campaigns.length > 0) {
                console.log('\n📝 Campaign prompts:');
                campaigns.forEach(campaign => {
                    console.log(`   Campaign ${campaign.id} (${campaign.name || 'Unnamed'}):`);
                    if (campaign.prompt) {
                        console.log(`      Prompt: ${campaign.prompt.slice(0, 150)}...`);
                    } else {
                        console.log(`      No prompt found`);
                    }
                });
            }
        }

        // Look for any other tables that might contain prompts
        console.log('\n🔍 Looking for prompt-related data in all tables...');
        for (const table of tables) {
            const currentTable = table.table_name;

            // Check if table has prompt-related columns
            const columns = await prisma.$queryRaw`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = ${currentTable}
                AND table_schema = 'public'
                AND (column_name ILIKE '%prompt%' OR column_name ILIKE '%template%')
            `;

            if (columns.length > 0) {
                console.log(`   Table "${currentTable}" has prompt-related columns:`, columns.map(c => c.column_name));

                // Get sample data (using direct query to avoid SQL injection)
                try {
                    if (currentTable === 'CO_campaigns') {
                        const sampleData = await prisma.$queryRaw`SELECT * FROM "CO_campaigns" LIMIT 2`;
                        if (sampleData.length > 0) {
                            console.log(`     Sample data:`, JSON.stringify(sampleData[0], null, 2));
                        }
                    }
                } catch (error) {
                    console.log(`     (Could not read data from ${currentTable})`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error checking database prompts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
if (require.main === module) {
    checkDatabasePrompts();
}

module.exports = { checkDatabasePrompts }; 