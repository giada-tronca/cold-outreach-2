const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Clean up temporary campaigns and their associated data
 */
async function cleanupTemporaryCampaigns() {
    try {
        console.log('🧹 Starting cleanup of temporary campaigns...');

        // Find all campaigns with "Temporary" in the name (old temporary campaigns)
        const temporaryCampaigns = await prisma.cOCampaigns.findMany({
            where: {
                OR: [
                    { name: { contains: 'Temporary Enrichment Campaign' } },
                    { name: { contains: 'Temporary Campaign for Enrichment' } }
                ]
            },
            include: {
                prospects: {
                    include: {
                        enrichment: true,
                        generatedEmail: true
                    }
                },
                batches: true
            }
        });

        // Also find temporary prospects in the default enrichment campaign
        const defaultEnrichmentCampaign = await prisma.cOCampaigns.findFirst({
            where: { name: 'Default Enrichment Campaign' },
            include: {
                prospects: {
                    where: {
                        additionalData: {
                            path: ['temporaryProspect'],
                            equals: true
                        }
                    },
                    include: {
                        enrichment: true,
                        generatedEmail: true
                    }
                }
            }
        });

        console.log(`🔍 Found ${temporaryCampaigns.length} temporary campaigns to clean up`);

        if (defaultEnrichmentCampaign && defaultEnrichmentCampaign.prospects.length > 0) {
            console.log(`🔍 Found ${defaultEnrichmentCampaign.prospects.length} temporary prospects in default enrichment campaign`);
        }

        // Clean up temporary prospects from default enrichment campaign first
        if (defaultEnrichmentCampaign && defaultEnrichmentCampaign.prospects.length > 0) {
            console.log(`\n🗑️  Cleaning up temporary prospects from Default Enrichment Campaign (ID: ${defaultEnrichmentCampaign.id})`);

            const prospectIds = defaultEnrichmentCampaign.prospects.map(p => p.id);

            // Delete enrichment data
            const deletedEnrichments = await prisma.cOProspectEnrichments.deleteMany({
                where: { prospectId: { in: prospectIds } }
            });
            console.log(`   ✅ Deleted ${deletedEnrichments.count} enrichment records`);

            // Delete generated emails
            const deletedEmails = await prisma.cOGeneratedEmails.deleteMany({
                where: { prospectId: { in: prospectIds } }
            });
            console.log(`   ✅ Deleted ${deletedEmails.count} generated emails`);

            // Delete prospects
            const deletedProspects = await prisma.cOProspects.deleteMany({
                where: { id: { in: prospectIds } }
            });
            console.log(`   ✅ Deleted ${deletedProspects.count} temporary prospects`);
            console.log(`   🔄 Default enrichment campaign preserved for reuse`);
        }

        // Clean up old temporary campaigns
        for (const campaign of temporaryCampaigns) {
            console.log(`\n🗑️  Processing campaign: ${campaign.name} (ID: ${campaign.id})`);
            console.log(`   - Prospects: ${campaign.prospects.length}`);
            console.log(`   - Batches: ${campaign.batches.length}`);

            if (campaign.prospects.length > 0) {
                const prospectIds = campaign.prospects.map(p => p.id);

                // Delete enrichment data
                const deletedEnrichments = await prisma.cOProspectEnrichments.deleteMany({
                    where: { prospectId: { in: prospectIds } }
                });
                console.log(`   ✅ Deleted ${deletedEnrichments.count} enrichment records`);

                // Delete generated emails
                const deletedEmails = await prisma.cOGeneratedEmails.deleteMany({
                    where: { prospectId: { in: prospectIds } }
                });
                console.log(`   ✅ Deleted ${deletedEmails.count} generated emails`);

                // Delete prospects
                const deletedProspects = await prisma.cOProspects.deleteMany({
                    where: { id: { in: prospectIds } }
                });
                console.log(`   ✅ Deleted ${deletedProspects.count} prospects`);
            }

            // Delete batches
            if (campaign.batches.length > 0) {
                const deletedBatches = await prisma.cOBatches.deleteMany({
                    where: { campaignId: campaign.id }
                });
                console.log(`   ✅ Deleted ${deletedBatches.count} batches`);
            }

            // Delete campaign
            await prisma.cOCampaigns.delete({
                where: { id: campaign.id }
            });
            console.log(`   ✅ Deleted campaign: ${campaign.name}`);
        }

        const totalProspectsCleanedUp = defaultEnrichmentCampaign ? defaultEnrichmentCampaign.prospects.length : 0;
        console.log(`\n🎉 Cleanup completed!`);
        console.log(`   - Removed ${temporaryCampaigns.length} old temporary campaigns`);
        console.log(`   - Cleaned up ${totalProspectsCleanedUp} temporary prospects from default enrichment campaign`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the cleanup
cleanupTemporaryCampaigns(); 