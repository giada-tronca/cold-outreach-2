"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVImportProcessor = void 0;
const fs_1 = require("fs");
const csv_parser_1 = __importDefault(require("csv-parser"));
const database_1 = require("@/config/database");
/**
 * CSV Import Processor
 * Processes uploaded CSV files and creates prospects in the database
 */
class CSVImportProcessor {
    /**
     * Process CSV import job
     * Creates campaigns, batches, and prospects from uploaded CSV data
     */
    static async process(job) {
        const { filePath, mappingConfig = {}, workflowSessionId, createCampaign = true, campaignName, campaignSettings } = job.data;
        let createdCampaignId = null;
        let createdBatchId = null;
        let prospectsCreated = 0;
        let prospectsSkipped = 0;
        try {
            console.log('📋 [CSV Import]: Starting CSV import processing');
            await job.updateProgress(5);
            // Create campaign if needed
            if (createCampaign) {
                console.log('📋 [CSV Import]: Creating campaign');
                const campaign = await database_1.prisma.cOCampaigns.create({
                    data: {
                        name: campaignName || `CSV Import Campaign - ${new Date().toISOString()}`,
                        emailSubject: campaignSettings?.emailSubject || 'Default Subject',
                        prompt: campaignSettings?.prompt || 'Default prompt for email generation',
                        enrichmentFlags: campaignSettings?.enrichmentFlags || ['proxycurl', 'firecrawl', 'builtwith'],
                        serviceId: campaignSettings?.serviceId || null
                    }
                });
                createdCampaignId = campaign.id;
                console.log(`✅ [CSV Import]: Created campaign`, createdCampaignId);
            }
            else {
                console.log('🔬 [CSV Import]: Campaign creation disabled, will need existing campaign');
            }
            await job.updateProgress(10);
            // Create batch for tracking
            if (createdCampaignId) {
                console.log('📋 [CSV Import]: Creating batch');
                const batchName = `CSV Import Batch - ${new Date().toISOString()}`;
                const batch = await database_1.prisma.cOBatches.create({
                    data: {
                        campaignId: createdCampaignId,
                        name: batchName,
                        status: 'UPLOADED'
                    }
                });
                createdBatchId = batch.id;
                console.log(`✅ [CSV Import]: Created batch`, createdBatchId);
            }
            await job.updateProgress(20);
            // Parse CSV and create prospects
            const prospects = [];
            console.log('📄 [CSV Import]: Reading CSV file:', filePath);
            await new Promise((resolve, reject) => {
                (0, fs_1.createReadStream)(filePath)
                    .pipe((0, csv_parser_1.default)())
                    .on('data', (row) => {
                    prospects.push(row);
                })
                    .on('end', () => {
                    console.log(`📊 [CSV Import]: Parsed ${prospects.length} rows from CSV`);
                    resolve(undefined);
                })
                    .on('error', (error) => {
                    console.error('❌ [CSV Import]: Error reading CSV:', error);
                    reject(error);
                });
            });
            await job.updateProgress(40);
            // Process prospects in batches
            const batchSize = 50;
            let processed = 0;
            for (let i = 0; i < prospects.length; i += batchSize) {
                const batch = prospects.slice(i, i + batchSize);
                for (const prospectData of batch) {
                    try {
                        // Map CSV columns to prospect fields
                        const prospect = await this.mapProspectData(prospectData, mappingConfig);
                        if (prospect.email && prospect.email.trim()) {
                            // Check for duplicates (based on email and campaign)
                            const whereClause = { email: prospect.email };
                            if (createdCampaignId) {
                                whereClause.campaignId = createdCampaignId;
                            }
                            const existing = await database_1.prisma.cOProspects.findFirst({ where: whereClause });
                            if (existing) {
                                console.log(`⚠️ [CSV Import]: Skipping duplicate email: ${prospect.email}`);
                                prospectsSkipped++;
                                continue;
                            }
                            // Create prospect data (campaignId is always required due to schema constraints)
                            const prospectCreateData = {
                                name: prospect.name,
                                email: prospect.email,
                                company: prospect.company,
                                position: prospect.position,
                                linkedinUrl: prospect.linkedinUrl,
                                additionalData: {
                                    ...prospect.additionalData,
                                    workflowSessionId: workflowSessionId
                                },
                                status: 'PENDING',
                                campaignId: createdCampaignId,
                                batchId: createdBatchId
                            };
                            // Create prospect
                            await database_1.prisma.cOProspects.create({ data: prospectCreateData });
                            prospectsCreated++;
                            console.log(`✅ [CSV Import]: Created prospect: ${prospect.name} (${prospect.email})`);
                        }
                        else {
                            console.log(`⚠️ [CSV Import]: Skipping prospect with missing email`);
                            prospectsSkipped++;
                        }
                    }
                    catch (error) {
                        console.error(`❌ [CSV Import]: Error processing prospect:`, error);
                        prospectsSkipped++;
                    }
                    processed++;
                    const progress = 40 + (processed / prospects.length) * 50;
                    await job.updateProgress(progress);
                }
            }
            // Update batch with final counts
            if (createdBatchId) {
                await database_1.prisma.cOBatches.update({
                    where: { id: createdBatchId },
                    data: {
                        totalProspects: prospectsCreated,
                        status: prospectsCreated > 0 ? 'UPLOADED' : 'FAILED'
                    }
                });
            }
            await job.updateProgress(100);
            const result = {
                campaignId: createdCampaignId,
                batchId: createdBatchId,
                prospectsCreated,
                prospectsSkipped,
                totalRows: prospects.length,
                success: true,
                workflowSessionId
            };
            console.log('✅ [CSV Import]: CSV import completed successfully:', result);
            return result;
        }
        catch (error) {
            console.error('❌ [CSV Import]: Error processing CSV import:', error);
            // Clean up created resources on error
            if (createdBatchId) {
                try {
                    await database_1.prisma.cOBatches.delete({ where: { id: createdBatchId } });
                    console.log('🗑️ [CSV Import]: Cleaned up batch on error');
                }
                catch (cleanupError) {
                    console.error('❌ [CSV Import]: Error cleaning up batch:', cleanupError);
                }
            }
            if (createdCampaignId) {
                try {
                    await database_1.prisma.cOCampaigns.delete({ where: { id: createdCampaignId } });
                    console.log('🗑️ [CSV Import]: Cleaned up campaign on error');
                }
                catch (cleanupError) {
                    console.error('❌ [CSV Import]: Error cleaning up campaign:', cleanupError);
                }
            }
            throw error;
        }
    }
    /**
     * Map CSV row data to prospect fields
     */
    static async mapProspectData(csvRow, mappingConfig) {
        // Default mapping if no custom mapping provided
        const defaultMapping = {
            name: ['name', 'full_name', 'fullname', 'contact_name'],
            email: ['email', 'email_address', 'contact_email'],
            company: ['company', 'company_name', 'organization'],
            position: ['position', 'title', 'job_title', 'role'],
            linkedinUrl: ['linkedin', 'linkedin_url', 'linkedin_profile']
        };
        const mapping = { ...defaultMapping, ...mappingConfig };
        const prospect = {};
        // Map each field
        for (const [prospectField, csvFields] of Object.entries(mapping)) {
            for (const csvField of csvFields) {
                if (csvRow[csvField] && csvRow[csvField].trim()) {
                    prospect[prospectField] = csvRow[csvField].trim();
                    break;
                }
            }
        }
        // Store any additional data not in the main mapping
        const additionalData = {};
        for (const [key, value] of Object.entries(csvRow)) {
            const isMainField = Object.values(mapping).flat().includes(key);
            if (!isMainField && value) {
                additionalData[key] = value;
            }
        }
        if (Object.keys(additionalData).length > 0) {
            prospect.additionalData = additionalData;
        }
        return prospect;
    }
    /**
     * Clean up temporary data (called after workflow completion)
     */
    static async cleanupTemporaryData(workflowSessionId) {
        try {
            console.log(`🗑️ [CSV Import]: Cleaning up temporary data for workflow ${workflowSessionId}`);
            // Find all prospects associated with this workflow session
            const prospectsToDelete = await database_1.prisma.cOProspects.findMany({
                where: {
                    additionalData: {
                        path: ['workflowSessionId'],
                        equals: workflowSessionId
                    }
                },
                include: {
                    batch: true,
                    campaign: true
                }
            });
            console.log(`🔍 [CSV Import]: Found ${prospectsToDelete.length} prospects to potentially clean up`);
            // Delete prospects and their related data
            for (const prospect of prospectsToDelete) {
                // Delete related enrichment data
                await database_1.prisma.cOProspectEnrichments.deleteMany({
                    where: { prospectId: prospect.id }
                });
                // Delete related generated emails
                await database_1.prisma.cOGeneratedEmails.deleteMany({
                    where: { prospectId: prospect.id }
                });
                // Delete the prospect
                await database_1.prisma.cOProspects.delete({
                    where: { id: prospect.id }
                });
                console.log(`🗑️ [CSV Import]: Deleted prospect ${prospect.name} (${prospect.email})`);
            }
            console.log(`✅ [CSV Import]: Cleanup completed for workflow ${workflowSessionId}`);
        }
        catch (error) {
            console.error(`❌ [CSV Import]: Error during cleanup:`, error);
            throw error;
        }
    }
}
exports.CSVImportProcessor = CSVImportProcessor;
