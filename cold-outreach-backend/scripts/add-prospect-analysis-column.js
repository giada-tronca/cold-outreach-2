const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addProspectAnalysisColumn() {
    console.log('🛠️  Adding prospect_analysis_summary column to database...\n');

    try {
        // Step 1: Check if column already exists
        console.log('📋 Checking current CO_prospect_enrichments table structure...');
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'CO_prospect_enrichments' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `;

        console.log('   Existing columns:');
        columns.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
            const defaultVal = col.column_default ? ` default: ${col.column_default}` : '';
            console.log(`      - ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
        });

        // Step 2: Check if prospect_analysis_summary column exists
        const analysisColumnExists = columns.some(col => col.column_name === 'prospect_analysis_summary');

        if (!analysisColumnExists) {
            console.log('\n🔧 Adding prospect_analysis_summary column...');
            await prisma.$executeRaw`ALTER TABLE "CO_prospect_enrichments" ADD COLUMN prospect_analysis_summary TEXT;`;
            console.log('   ✅ prospect_analysis_summary column added successfully');
        } else {
            console.log('\n✅ prospect_analysis_summary column already exists');
        }

        // Step 3: Verify the column was added
        console.log('\n🔍 Verifying column addition...');
        const updatedColumns = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'CO_prospect_enrichments' 
            AND table_schema = 'public'
            AND column_name = 'prospect_analysis_summary';
        `;

        if (updatedColumns.length > 0) {
            const col = updatedColumns[0];
            console.log(`   ✅ Column verified: ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
        }

        // Step 4: Check current data
        console.log('\n📊 Checking existing enrichment data...');
        const enrichmentStats = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_records,
                COUNT(linkedin_summary) as has_linkedin,
                COUNT(company_summary) as has_company,
                COUNT(tech_stack) as has_tech_stack,
                COUNT(prospect_analysis_summary) as has_analysis
            FROM "CO_prospect_enrichments";
        `;

        if (enrichmentStats.length > 0) {
            const stats = enrichmentStats[0];
            console.log('   📈 Enrichment data statistics:');
            console.log(`      Total records: ${stats.total_records}`);
            console.log(`      LinkedIn summaries: ${stats.has_linkedin}`);
            console.log(`      Company summaries: ${stats.has_company}`);
            console.log(`      Tech stacks: ${stats.has_tech_stack}`);
            console.log(`      Prospect analyses: ${stats.has_analysis}`);
        }

        console.log('\n🎉 Database schema update completed successfully!');
        console.log('\n📋 Updated Prospect Enrichment Schema:');
        console.log('   Table: CO_prospect_enrichments');
        console.log('   Enrichment Fields:');
        console.log('      - linkedin_summary (TEXT) - LinkedIn profile analysis');
        console.log('      - company_summary (TEXT) - Company website analysis');
        console.log('      - tech_stack (JSON) - BuiltWith technology analysis');
        console.log('      - prospect_analysis_summary (TEXT) - Combined analysis (NEW ✅)');

        console.log('\n🔧 Next Steps:');
        console.log('1. Regenerate Prisma client: npx prisma generate');
        console.log('2. Test prospect analysis endpoint: node scripts/test-prospect-analysis.js');
        console.log('3. Run full enrichment workflow on a test prospect');

    } catch (error) {
        console.error('❌ Error adding prospect_analysis_summary column:', error);

        if (error.message.includes('relation "CO_prospect_enrichments" does not exist')) {
            console.log('\n💡 The CO_prospect_enrichments table does not exist.');
            console.log('   Please check your database connection and run migrations.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
if (require.main === module) {
    addProspectAnalysisColumn();
}

module.exports = { addProspectAnalysisColumn }; 