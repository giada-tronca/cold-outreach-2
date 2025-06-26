const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSchemaUpdate() {
    console.log('🧪 Testing Prisma client with updated schema (no CO_ prefix)...\n');

    try {
        // Test that we can connect and query the tables
        console.log('1. Testing connection to database...');

        // Check if the new table names are accessible
        console.log('2. Testing access to tables without CO_ prefix...');

        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('api_configurations', 'campaigns', 'prospects', 'batches', 'prompts', 'services', 'workflow_sessions', 'prospect_enrichments', 'generated_emails', 'auto_service_settings', 'profiles')
            ORDER BY table_name;
        `;

        console.log('✅ Tables found with clean names:');
        tables.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });

        if (tables.length === 0) {
            console.log('❌ No tables found with clean names. Make sure you ran the SQL script.');
            return;
        }

        // Test Prisma models work correctly
        console.log('\n3. Testing Prisma models...');

        // Test basic operations
        const apiConfigCount = await prisma.cOApiConfigurations.count();
        console.log(`   ✅ COApiConfigurations model works - found ${apiConfigCount} records`);

        const campaignCount = await prisma.cOCampaigns.count();
        console.log(`   ✅ COCampaigns model works - found ${campaignCount} records`);

        const prospectCount = await prisma.cOProspects.count();
        console.log(`   ✅ COProspects model works - found ${prospectCount} records`);

        console.log('\n🎉 Schema update successful! The webapp should work with clean table names.');
        console.log('\n✅ Next steps:');
        console.log('   1. Start your backend server');
        console.log('   2. Test your API endpoints');
        console.log('   3. Verify frontend still works correctly');

    } catch (error) {
        console.error('❌ Error testing schema update:', error.message);

        if (error.message.includes('does not exist')) {
            console.log('\n💡 This likely means:');
            console.log('   1. You haven\'t run the SQL script yet, OR');
            console.log('   2. Your DATABASE_URL is pointing to the old database');
            console.log('   3. Make sure you\'re connected to the new database with clean table names');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testSchemaUpdate(); 