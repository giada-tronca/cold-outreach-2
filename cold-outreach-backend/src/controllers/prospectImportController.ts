import { Request, Response } from 'express';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { DatabaseError } from '@/utils/errors';
import { prisma } from '@/config/database';
import path from 'path';
import { createReadStream, promises as fsPromises } from 'fs';
import csvParser from 'csv-parser';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload CSV file for prospect import
 */
export async function uploadCSV(req: Request, res: Response): Promise<void> {
  try {
    // Basic validation
    if (!req.file) {
      ApiResponseBuilder.badRequest(res, 'No file uploaded');
      return;
    }

    const { originalname, size, mimetype } = req.file;

    if (mimetype !== 'text/csv') {
      ApiResponseBuilder.badRequest(res, 'Only CSV files are allowed');
      return;
    }

    // Generate upload ID and move file to permanent location
    const uploadId = uuidv4();
    const uploadPath = path.join(process.cwd(), 'uploads', `${uploadId}.csv`);

    await fsPromises.rename(req.file.path, uploadPath);

    ApiResponseBuilder.success(
      res,
      {
        uploadId,
        filename: originalname,
        size,
        mimetype,
      },
      'File uploaded successfully'
    );
  } catch (error) {
    console.error('Error uploading CSV:', error);
    ApiResponseBuilder.error(res, 'Failed to upload CSV file');
  }
}

export async function getImportTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const templatePath = path.join(
      process.cwd(),
      'public',
      'templates',
      'prospect-template.csv'
    );

    // Check if template exists
    try {
      await fsPromises.access(templatePath);
    } catch {
      // Create template if it doesn't exist
      const templateContent =
        'name,email,company,position,linkedin_url\n' +
        'John Doe,john@example.com,Example Corp,Sales Manager,https://linkedin.com/in/johndoe\n' +
        'Jane Smith,jane@company.com,Tech Inc,Marketing Director,https://linkedin.com/in/janesmith';

      await fsPromises.writeFile(templatePath, templateContent);
    }

    // Send the template file
    res.download(templatePath, 'prospect-template.csv', err => {
      if (err) {
        console.error('Error sending template:', err);
        ApiResponseBuilder.error(res, 'Failed to download template');
      }
    });
  } catch (error) {
    console.error('Error getting import template:', error);
    throw new DatabaseError('Failed to get import template');
  }
}

export class ProspectImportController {
  async importFromCSV(req: Request, res: Response): Promise<void> {
    try {
      const {
        fileId,
        csvData,
        filename,
        campaignId: existingCampaignId,
      } = req.body;

      if (!fileId && !csvData) {
        ApiResponseBuilder.badRequest(
          res,
          'Either fileId or csvData is required'
        );
        return;
      }

      if (!filename) {
        ApiResponseBuilder.badRequest(res, 'Filename is required');
        return;
      }

      if (!existingCampaignId) {
        ApiResponseBuilder.badRequest(
          res,
          'Campaign ID is required - please select an existing campaign'
        );
        return;
      }

      let processedData: any[] = [];
      let filePath: string | null = null;

      // Handle direct CSV data (from local fallback uploads)
      if (csvData && Array.isArray(csvData)) {
        processedData = csvData;
        console.log(
          `📊 [Import]: Processing ${processedData.length} rows from direct CSV data`
        );
      } else if (fileId) {
        // Handle file-based uploads
        filePath = `uploads/${fileId}.csv`;

        if (!existsSync(filePath)) {
          ApiResponseBuilder.badRequest(res, 'CSV file not found');
          return;
        }

        // Read and parse the CSV file
        processedData = await new Promise<any[]>((resolve, reject) => {
          const results: any[] = [];
          createReadStream(filePath!)
            .pipe(csvParser())
            .on('data', row => results.push(row))
            .on('end', () => resolve(results))
            .on('error', error => reject(error));
        });
        console.log(
          `📊 [Import]: Processed ${processedData.length} rows from CSV file`
        );
      }

      if (processedData.length === 0) {
        ApiResponseBuilder.badRequest(res, 'No valid data found in CSV');
        return;
      }

      // Verify the campaign exists
      const campaign = await prisma.cOCampaigns.findUnique({
        where: { id: existingCampaignId },
      });

      if (!campaign) {
        ApiResponseBuilder.badRequest(
          res,
          'Campaign not found - please select a valid existing campaign'
        );
        return;
      }

      console.log(
        `📋 [Import]: Using existing campaign: ${campaign.name} (ID: ${existingCampaignId})`
      );

      // NOTE: We don't create batches here - batches are created when enrichment starts
      // This ensures only the specific prospects from this upload are processed

      // Process and validate prospect data
      const prospectsToCreate: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];

        try {
          // Extract prospect fields from CSV row
          const prospectData = this.extractProspectFromRow(row);

          // Validate required fields
          if (
            !prospectData.email &&
            !prospectData.name &&
            !prospectData.company
          ) {
            errors.push(
              `Row ${i + 1}: At least one of email, name, or company is required`
            );
            continue;
          }

          // Validate email format if provided
          if (prospectData.email && !this.isValidEmail(prospectData.email)) {
            errors.push(
              `Row ${i + 1}: Invalid email format: ${prospectData.email}`
            );
            continue;
          }

          prospectsToCreate.push({
            ...prospectData,
            campaignId: existingCampaignId,
            batchId: null, // Batch will be created when enrichment starts
            status: 'PENDING',
            additionalData: {
              ...prospectData.additionalData,
              csvRowIndex: i + 1,
              uploadSession: new Date().toISOString(), // Track which upload session this came from
            },
          });
        } catch (error) {
          console.error(`❌ [Import]: Error processing row ${i + 1}:`, error);
          errors.push(
            `Row ${i + 1}: ${error instanceof Error ? error.message : 'Processing error'}`
          );
        }
      }

      if (prospectsToCreate.length === 0) {
        ApiResponseBuilder.badRequest(res, 'No valid prospects found in CSV');
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
            if (prospectData.email && existingCampaignId) {
              const existingProspect = await prisma.cOProspects.findFirst({
                where: {
                  email: prospectData.email,
                  campaignId: existingCampaignId,
                },
              });

              if (existingProspect) {
                console.log(
                  `⚠️ [Import]: Skipping duplicate email: ${prospectData.email}`
                );
                prospectsSkipped++;
                continue;
              }
            }

            await prisma.cOProspects.create({
              data: prospectData,
            });
            prospectsCreated++;
          } catch (error) {
            console.error(`❌ [Import]: Error creating prospect:`, error);
            prospectsSkipped++;
          }
        }
      }

      console.log(
        `✅ [Import]: Import completed - ${prospectsCreated} created, ${prospectsSkipped} skipped`
      );

      ApiResponseBuilder.success(
        res,
        {
          campaignId: existingCampaignId,
          batchId: null, // No batch created during import
          prospectsCreated,
          prospectsSkipped,
          totalRows: processedData.length,
        },
        'CSV import completed successfully',
        201
      );
    } catch (error) {
      console.error('❌ [Import]: CSV import failed:', error);
      ApiResponseBuilder.error(res, 'CSV import failed');
    }
  }

  /**
   * Extract prospect data from CSV row
   */
  private extractProspectFromRow(row: any): any {
    // Common column name mappings
    const fieldMappings = {
      name: [
        'name',
        'full_name',
        'fullname',
        'contact_name',
        'first_name',
        'last_name',
      ],
      email: ['email', 'email_address', 'contact_email', 'work_email'],
      company: ['company', 'company_name', 'organization', 'employer'],
      position: ['position', 'title', 'job_title', 'role', 'job_role'],
      linkedinUrl: [
        'linkedin',
        'linkedin_url',
        'linkedin_profile',
        'linkedin_link',
      ],
      phone: ['phone', 'phone_number', 'mobile', 'contact_number'],
      location: ['location', 'city', 'country', 'address'],
    };

    const prospect: any = {};
    const additionalData: any = {};

    // Extract mapped fields
    for (const [field, possibleColumns] of Object.entries(fieldMappings)) {
      for (const column of possibleColumns) {
        const value =
          row[column] || row[column.toLowerCase()] || row[column.toUpperCase()];
        if (value && typeof value === 'string' && value.trim()) {
          prospect[field] = value.trim();
          break;
        }
      }
    }

    // Store unmapped columns as additional data
    for (const [key, value] of Object.entries(row)) {
      if (value && typeof value === 'string' && value.trim()) {
        const isMappedField = Object.values(fieldMappings)
          .flat()
          .some(column => column.toLowerCase() === key.toLowerCase());
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
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
