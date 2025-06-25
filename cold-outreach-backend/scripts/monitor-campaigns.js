const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Monitor campaigns in the database
 */
async function monitorCampaigns() {
    try {
        console.log('📊 Current campaigns in database:\n');

        const campaigns = await prisma.cOCampaigns.findMany({
            include: {
                prospects: {
                    where: {
                        additionalData: {
                            path: ['temporaryProspect'],
                            equals: true
                        }
                    }
                },
                batches: true,
                _count: {
                    select: {
                        prospects: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`Total campaigns: ${campaigns.length}\n`);

        campaigns.forEach((campaign, index) => {
            console.log(`${index + 1}. Campaign: ${campaign.name} (ID: ${campaign.id})`);
            console.log(`   Created: ${campaign.createdAt.toISOString()}`);
            console.log(`   Total prospects: ${campaign._count.prospects}`);
            console.log(`   Temporary prospects: ${campaign.prospects.length}`);
            console.log(`   Batches: ${campaign.batches.length}`);

            if (campaign.name.includes('Temporary')) {
                console.log(`   ⚠️  This is a temporary campaign that should be cleaned up`);
            } else if (campaign.name === 'Default Enrichment Campaign') {
                console.log(`   ✅ This is the default enrichment campaign (should be reused)`);
            }
            console.log('');
        });

        // Show summary
        const temporaryCampaigns = campaigns.filter(c => c.name.includes('Temporary'));
        const defaultEnrichmentCampaign = campaigns.find(c => c.name === 'Default Enrichment Campaign');

        console.log('📋 Summary:');
        console.log(`   - Total campaigns: ${campaigns.length}`);
        console.log(`   - Temporary campaigns: ${temporaryCampaigns.length}`);
        console.log(`   - Default enrichment campaign: ${defaultEnrichmentCampaign ? 'EXISTS' : 'NOT FOUND'}`);

        if (defaultEnrichmentCampaign) {
            console.log(`   - Temporary prospects in default campaign: ${defaultEnrichmentCampaign.prospects.length}`);
        }

    } catch (error) {
        console.error('❌ Error monitoring campaigns:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the monitor
monitorCampaigns(); 