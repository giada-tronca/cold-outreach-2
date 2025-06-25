const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Read prompt files
function readPromptFile(filename) {
    try {
        const filePath = path.join(__dirname, '..', '..', 'prompts', filename);
        const content = fs.readFileSync(filePath, 'utf8');
        return content.trim();
    } catch (error) {
        console.error(`Error reading ${filename}:`, error.message);
        return null;
    }
}

async function setupPromptsTable() {
    console.log('🛠️  Setting up CO_prompts table and migrating prompts...\n');

    try {
        // Step 1: Check if CO_prompts table exists
        console.log('📋 Checking if CO_prompts table exists...');
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'CO_prompts' 
            AND table_schema = 'public';
        `;

        let tableExists = tables.length > 0;

        if (!tableExists) {
            console.log('🔧 Creating CO_prompts table...');
            await prisma.$executeRaw`
                CREATE TABLE "CO_prompts" (
                    id SERIAL PRIMARY KEY,
                    company_summary_prompt TEXT,
                    linkedin_summary_prompt TEXT,
                    tech_stack_prompt TEXT,
                    prospect_analysis_prompt TEXT,
                    is_active BOOLEAN DEFAULT true NOT NULL,
                    version VARCHAR(50),
                    description TEXT,
                    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
            `;
            console.log('✅ CO_prompts table created successfully');
        } else {
            console.log('✅ CO_prompts table already exists');
        }

        // Step 2: Read prompts from files
        console.log('\n📄 Reading prompt files...');

        const companySummaryPrompt = readPromptFile('company_summary_prompt.md');
        const prospectAnalysisPrompt = readPromptFile('prospect_analysis.md');
        const linkedinSummaryPrompt = readPromptFile('linkedin_summary_prompt.md');
        const techStackPrompt = readPromptFile('tech_stack_prompt.md');

        console.log(`   Company Summary: ${companySummaryPrompt ? '✅ Loaded' : '❌ Failed'} (${companySummaryPrompt?.length || 0} characters)`);
        console.log(`   Prospect Analysis: ${prospectAnalysisPrompt ? '✅ Loaded' : '❌ Failed'} (${prospectAnalysisPrompt?.length || 0} characters)`);
        console.log(`   LinkedIn Summary: ${linkedinSummaryPrompt ? '✅ Loaded' : '❌ Failed'} (${linkedinSummaryPrompt?.length || 0} characters)`);
        console.log(`   Tech Stack Analysis: ${techStackPrompt ? '✅ Loaded' : '❌ Failed'} (${techStackPrompt?.length || 0} characters)`);

        // Step 3: Check if prompts already exist in the table
        console.log('\n📊 Checking existing prompts in database...');
        const existingPrompts = await prisma.cOPrompts.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (existingPrompts.length === 0) {
            console.log('🔧 Inserting prompts into CO_prompts table...');

            const promptData = {
                companySummaryPrompt,
                linkedinSummaryPrompt,
                techStackPrompt,
                prospectAnalysisPrompt,
                isActive: true,
                version: '1.0',
                description: 'Initial prompts migration from files'
            };

            const createdPrompt = await prisma.cOPrompts.create({
                data: promptData
            });

            console.log(`✅ Prompts inserted successfully with ID: ${createdPrompt.id}`);
        } else {
            console.log(`✅ Prompts already exist (${existingPrompts.length} records found)`);
            console.log('♻️  Updating existing prompts with latest content...');

            const latestPrompt = existingPrompts[0];
            const updatedPrompt = await prisma.cOPrompts.update({
                where: { id: latestPrompt.id },
                data: {
                    companySummaryPrompt,
                    linkedinSummaryPrompt,
                    techStackPrompt,
                    prospectAnalysisPrompt,
                    version: '1.1',
                    description: 'Updated prompts from migration script'
                }
            });

            console.log(`✅ Prompts updated successfully (ID: ${updatedPrompt.id})`);
        }

        // Step 4: Remove prompt_templates column from CO_api_configurations (if it exists)
        console.log('\n🔧 Checking CO_api_configurations table...');
        const apiConfigColumns = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'CO_api_configurations' 
            AND table_schema = 'public'
            AND column_name = 'prompt_templates';
        `;

        if (apiConfigColumns.length > 0) {
            console.log('🗑️  Removing deprecated prompt_templates column...');
            await prisma.$executeRaw`
                ALTER TABLE "CO_api_configurations" DROP COLUMN IF EXISTS prompt_templates;
            `;
            console.log('✅ prompt_templates column removed successfully');
        } else {
            console.log('✅ prompt_templates column already removed or does not exist');
        }

        // Step 5: Verify the setup
        console.log('\n🔍 Verifying prompts setup...');
        const verificationPrompts = await prisma.cOPrompts.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (verificationPrompts) {
            console.log('   📋 Verification Results:');
            console.log(`      ✅ Company Summary: ${verificationPrompts.companySummaryPrompt ? 'EXISTS' : 'MISSING'} (${verificationPrompts.companySummaryPrompt?.length || 0} chars)`);
            console.log(`      ✅ LinkedIn Summary: ${verificationPrompts.linkedinSummaryPrompt ? 'EXISTS' : 'MISSING'} (${verificationPrompts.linkedinSummaryPrompt?.length || 0} chars)`);
            console.log(`      ✅ Tech Stack Analysis: ${verificationPrompts.techStackPrompt ? 'EXISTS' : 'MISSING'} (${verificationPrompts.techStackPrompt?.length || 0} chars)`);
            console.log(`      ✅ Prospect Analysis: ${verificationPrompts.prospectAnalysisPrompt ? 'EXISTS' : 'MISSING'} (${verificationPrompts.prospectAnalysisPrompt?.length || 0} chars)`);
            console.log(`      📅 Version: ${verificationPrompts.version}`);
            console.log(`      🆔 Record ID: ${verificationPrompts.id}`);
        }

        console.log('\n🎉 Prompts table setup completed successfully!');
        console.log('\n📋 Database Structure Summary:');
        console.log('   Table: CO_prompts');
        console.log('   Columns:');
        console.log('      - company_summary_prompt (TEXT) - Website content analysis');
        console.log('      - linkedin_summary_prompt (TEXT) - LinkedIn profile analysis');
        console.log('      - tech_stack_prompt (TEXT) - BuiltWith technology analysis');
        console.log('      - prospect_analysis_prompt (TEXT) - Comprehensive prospect analysis');
        console.log('      - is_active (BOOLEAN) - Active/inactive flag');
        console.log('      - version (VARCHAR) - Prompt version');
        console.log('      - description (TEXT) - Change description');

        console.log('\n🔧 Next Steps:');
        console.log('1. Update apiConfigurationService to use CO_prompts table');
        console.log('2. Test enrichment endpoints with new prompts');
        console.log('3. Regenerate Prisma client: npx prisma generate');

    } catch (error) {
        console.error('❌ Error setting up prompts table:', error);

        if (error.message.includes('relation "CO_prompts" does not exist')) {
            console.log('\n💡 The CO_prompts table does not exist.');
            console.log('   Please run: npx prisma db push');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the setup
if (require.main === module) {
    setupPromptsTable();
}

module.exports = { setupPromptsTable }; 