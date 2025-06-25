import { Request, Response } from 'express';
import { ApiResponseBuilder } from '@/utils/apiResponse';
import { DatabaseError } from '@/utils/errors';
import { prisma } from '@/config/database';
import path from 'path';
import { createReadStream, promises as fsPromises } from 'fs';
import csvParser from 'csv-parser';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface ProspectData {
  name?: string;
  email?: string;
  company?: string;
  position?: string;
  linkedinUrl?: string;
  additionalData?: Record<string, any>;
}

interface CSVRow {
  [key: string]: string | undefined;
}

interface CSVImportRequest {
  fileId?: string;
  csvData?: CSVRow[];
  filename: string;
  campaignId: number;
}

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
      } = req.body as CSVImportRequest;

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

      let processedData: Record<string, string>[] = [];
      let filePath: string | null = null;

      // Handle direct CSV data (from local fallback uploads)
      if (csvData && Array.isArray(csvData) && csvData.length > 0) {
        processedData = csvData.map(row => {
          if (typeof row !== 'object' || row === null) {
            throw new Error('Invalid CSV data format');
          }
          return Object.entries(row).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>);
        });
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
        processedData = await new Promise<Record<string, string>[]>((resolve, reject) => {
          const results: Record<string, string>[] = [];
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

      // Process and validate prospect data
      const prospectsToCreate: ProspectData[] = [];
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
            errors.push(`Row ${i + 1}: Invalid email format`);
            continue;
          }

          // Add upload session ID to track this batch of prospects
          prospectData.additionalData = {
            ...prospectData.additionalData,
            uploadSession: fileId || uuidv4(),
          };

          prospectsToCreate.push(prospectData);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${(error as Error).message}`);
        }
      }

      // Create prospects in batches
      const createdProspects = await prisma.$transaction(
        prospectsToCreate.map(prospect =>
          prisma.cOProspects.create({
            data: {
              name: prospect.name || '',
              email: prospect.email || '',
              company: prospect.company || '',
              position: prospect.position || '',
              linkedinUrl: prospect.linkedinUrl,
              additionalData: prospect.additionalData || {},
              campaign: {
                connect: { id: existingCampaignId },
              },
            },
          })
        )
      );

      ApiResponseBuilder.success(
        res,
        {
          message: `Successfully imported ${createdProspects.length} prospects`,
          data: {
            totalRows: processedData.length,
            importedRows: createdProspects.length,
            errors,
          },
        },
        'Prospects imported successfully'
      );

      // Clean up uploaded file if it exists
      if (filePath && existsSync(filePath)) {
        await fsPromises.unlink(filePath);
      }
    } catch (error) {
      console.error('Error importing prospects:', error);
      ApiResponseBuilder.error(res, 'Failed to import prospects');
    }
  }

  private extractProspectFromRow(row: Record<string, string> | undefined): ProspectData {
    if (!row) {
      return {
        name: '',
        email: '',
        company: '',
        position: '',
        linkedinUrl: '',
        additionalData: {},
      };
    }

    const prospect: ProspectData = {
      name: row.name?.trim(),
      email: row.email?.trim(),
      company: row.company?.trim(),
      position: row.position?.trim(),
      linkedinUrl: row.linkedin_url?.trim() || row.linkedinUrl?.trim(),
      additionalData: {},
    };

    // Add any additional fields to additionalData
    Object.entries(row).forEach(([key, value]) => {
      if (!['name', 'email', 'company', 'position', 'linkedin_url', 'linkedinUrl'].includes(key)) {
        if (!prospect.additionalData) {
          prospect.additionalData = {};
        }
        prospect.additionalData[key] = value;
      }
    });

    return prospect;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
