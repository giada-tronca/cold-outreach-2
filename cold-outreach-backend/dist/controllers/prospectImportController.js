"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProspectImportController = void 0;
exports.uploadCSV = uploadCSV;
exports.getImportTemplate = getImportTemplate;
const apiResponse_1 = require("@/utils/apiResponse");
const errors_1 = require("@/utils/errors");
const database_1 = require("@/config/database");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_2 = require("fs");
const uuid_1 = require("uuid");
/**
 * Upload CSV file for prospect import
 */
async function uploadCSV(req, res) {
    try {
        // Basic validation
        if (!req.file) {
            apiResponse_1.ApiResponseBuilder.badRequest(res, 'No file uploaded');
            return;
        }
        const { originalname, size, mimetype } = req.file;
        if (mimetype !== 'text/csv') {
            apiResponse_1.ApiResponseBuilder.badRequest(res, 'Only CSV files are allowed');
            return;
        }
        // Generate upload ID and move file to permanent location
        const uploadId = (0, uuid_1.v4)();
        const uploadPath = path_1.default.join(process.cwd(), 'uploads', `${uploadId}.csv`);
        await require('fs').promises.rename(req.file.path, uploadPath);
        apiResponse_1.ApiResponseBuilder.success(res, {
            uploadId,
            filename: originalname,
            size,
            mimetype
        }, 'File uploaded successfully');
    }
    catch (error) {
        console.error('Error uploading CSV:', error);
        apiResponse_1.ApiResponseBuilder.error(res, 'Failed to upload CSV file');
    }
}
async function getImportTemplate(req, res) {
    try {
        const templatePath = path_1.default.join(process.cwd(), 'public', 'templates', 'prospect-template.csv');
        // Check if template exists
        try {
            await require('fs').promises.access(templatePath);
        }
        catch {
            // Create template if it doesn't exist
            const templateContent = 'name,email,company,position,linkedin_url\n' +
                'John Doe,john@example.com,Example Corp,Sales Manager,https://linkedin.com/in/johndoe\n' +
                'Jane Smith,jane@company.com,Tech Inc,Marketing Director,https://linkedin.com/in/janesmith';
            await require('fs').promises.writeFile(templatePath, templateContent);
        }
        // Send the template file
        res.download(templatePath, 'prospect-template.csv', (err) => {
            if (err) {
                console.error('Error sending template:', err);
                apiResponse_1.ApiResponseBuilder.error(res, 'Failed to download template');
            }
        });
    }
    catch (error) {
        console.error('Error getting import template:', error);
        throw new errors_1.DatabaseError('Failed to get import template');
    }
}
class ProspectImportController {
    async importFromCSV(req, res) {
        try {
            const { fileId, csvData, filename, createCampaign = true } = req.body;
            if (!fileId && !csvData) {
                apiResponse_1.ApiResponseBuilder.badRequest(res, 'Either fileId or csvData is required');
                return;
            }
            if (!filename) {
                apiResponse_1.ApiResponseBuilder.badRequest(res, 'Filename is required');
                return;
            }
            let processedData = [];
            let filePath = null;
            // Handle direct CSV data (from local fallback uploads)
            if (csvData && Array.isArray(csvData)) {
                processedData = csvData;
                console.log(`📊 [Import]: Processing ${processedData.length} rows from direct CSV data`);
            }
            else if (fileId) {
                // Handle file-based uploads
                filePath = `uploads/${fileId}.csv`;
                if (!(0, fs_2.existsSync)(filePath)) {
                    apiResponse_1.ApiResponseBuilder.badRequest(res, 'CSV file not found');
                    return;
                }
                // Read and parse the CSV file
                processedData = await new Promise((resolve, reject) => {
                    const results = [];
                    (0, fs_1.createReadStream)(filePath)
                        .pipe((0, csv_parser_1.default)())
                        .on('data', (row) => results.push(row))
                        .on('end', () => resolve(results))
                        .on('error', (error) => reject(error));
                });
                console.log(`📊 [Import]: Processed ${processedData.length} rows from CSV file`);
            }
            if (processedData.length === 0) {
                apiResponse_1.ApiResponseBuilder.badRequest(res, 'No valid data found in CSV');
                return;
            }
            // Create campaign if requested
            let campaignId = null;
            if (createCampaign) {
                console.log('📋 [Import]: Creating campaign for CSV import');
                const campaignName = `CSV Import - ${filename} - ${new Date().toISOString()}`;
                const campaign = await database_1.prisma.cOCampaigns.create({
                    data: {
                        name: campaignName,
                        emailSubject: 'Personalized Outreach',
                        prompt: 'Generate a personalized email for this prospect based on their profile and company information.',
                        enrichmentFlags: ['proxycurl', 'firecrawl', 'builtwith'],
                        serviceId: null
                    }
                });
                campaignId = campaign.id;
                console.log('✅ [Import]: Created campaign', campaignId);
            }
            // NOTE: We don't create batches here - batches are created when enrichment starts
            // This ensures only the specific prospects from this upload are processed
            // Process and validate prospect data
            const prospectsToCreate = [];
            const errors = [];
            for (let i = 0; i < processedData.length; i++) {
                const row = processedData[i];
                try {
                    // Extract prospect fields from CSV row
                    const prospectData = this.extractProspectFromRow(row);
                    // Validate required fields
                    if (!prospectData.email && !prospectData.name && !prospectData.company) {
                        errors.push(`Row ${i + 1}: At least one of email, name, or company is required`);
                        continue;
                    }
                    // Validate email format if provided
                    if (prospectData.email && !this.isValidEmail(prospectData.email)) {
                        errors.push(`Row ${i + 1}: Invalid email format: ${prospectData.email}`);
                        continue;
                    }
                    prospectsToCreate.push({
                        ...prospectData,
                        campaignId: campaignId,
                        batchId: null, // Batch will be created when enrichment starts
                        status: 'PENDING',
                        additionalData: {
                            ...prospectData.additionalData,
                            csvRowIndex: i + 1,
                            uploadSession: new Date().toISOString() // Track which upload session this came from
                        }
                    });
                }
                catch (error) {
                    console.error(`❌ [Import]: Error processing row ${i + 1}:`, error);
                    errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Processing error'}`);
                }
            }
            if (prospectsToCreate.length === 0) {
                apiResponse_1.ApiResponseBuilder.badRequest(res, 'No valid prospects found in CSV');
                return;
            }
            console.log('👥 Creating', prospectsToCreate.length, 'prospects');
            // Create prospects in batches to avoid memory issues
            const batchSize = 100;
            let prospectsCreated = 0;
            let prospectsSkipped = 0;
            for (let i = 0; i < prospectsToCreate.length; i += batchSize) {
                const batch = prospectsToCreate.slice(i, i + batchSize);
                for (const prospectData of batch) {
                    try {
                        // Check for duplicates
                        if (prospectData.email && campaignId) {
                            const existingProspect = await database_1.prisma.cOProspects.findFirst({
                                where: {
                                    email: prospectData.email,
                                    campaignId: campaignId
                                }
                            });
                            if (existingProspect) {
                                console.log(`⚠️ [Import]: Skipping duplicate email: ${prospectData.email}`);
                                prospectsSkipped++;
                                continue;
                            }
                        }
                        await database_1.prisma.cOProspects.create({
                            data: prospectData
                        });
                        prospectsCreated++;
                    }
                    catch (error) {
                        console.error(`❌ [Import]: Error creating prospect:`, error);
                        prospectsSkipped++;
                    }
                }
            }
            console.log(`✅ [Import]: Import completed - ${prospectsCreated} created, ${prospectsSkipped} skipped`);
            apiResponse_1.ApiResponseBuilder.success(res, {
                campaignId,
                batchId: null, // No batch created during import
                prospectsCreated,
                prospectsSkipped,
                totalRows: processedData.length
            }, 'CSV import completed successfully', 201);
        }
        catch (error) {
            console.error('❌ [Import]: CSV import failed:', error);
            apiResponse_1.ApiResponseBuilder.error(res, 'CSV import failed');
        }
    }
    /**
     * Extract prospect data from CSV row
     */
    extractProspectFromRow(row) {
        // Common column name mappings
        const fieldMappings = {
            name: ['name', 'full_name', 'fullname', 'contact_name', 'first_name', 'last_name'],
            email: ['email', 'email_address', 'contact_email', 'work_email'],
            company: ['company', 'company_name', 'organization', 'employer'],
            position: ['position', 'title', 'job_title', 'role', 'job_role'],
            linkedinUrl: ['linkedin', 'linkedin_url', 'linkedin_profile', 'linkedin_link'],
            phone: ['phone', 'phone_number', 'mobile', 'contact_number'],
            location: ['location', 'city', 'country', 'address']
        };
        const prospect = {};
        const additionalData = {};
        // Extract mapped fields
        for (const [field, possibleColumns] of Object.entries(fieldMappings)) {
            for (const column of possibleColumns) {
                const value = row[column] || row[column.toLowerCase()] || row[column.toUpperCase()];
                if (value && typeof value === 'string' && value.trim()) {
                    prospect[field] = value.trim();
                    break;
                }
            }
        }
        // Store unmapped columns as additional data
        for (const [key, value] of Object.entries(row)) {
            if (value && typeof value === 'string' && value.trim()) {
                const isMappedField = Object.values(fieldMappings).flat().some(column => column.toLowerCase() === key.toLowerCase());
                if (!isMappedField) {
                    additionalData[key] = value.trim();
                }
            }
        }
        if (Object.keys(additionalData).length > 0) {
            prospect.additionalData = additionalData;
        }
        return prospect;
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
exports.ProspectImportController = ProspectImportController;
