import { CSVRow } from './csvParser';
// import { Prospect } from '@/types';
// import { BadRequestError, ValidationError } from '@/utils/errors';

export interface ProspectData {
    name?: string;
    email: string;
    company?: string;
    position?: string;
    linkedinUrl?: string;
    additionalData?: Record<string, any>;
}

export interface MappingConfig {
    // Field mappings from CSV column names to prospect fields
    emailColumn: string;
    nameColumns?: string[];
    companyColumns?: string[];
    positionColumns?: string[];
    linkedinColumns?: string[];

    // Optional transformations
    nameFormatter?: (firstName?: string, lastName?: string, fullName?: string) => string;
    emailFormatter?: (email: string) => string;
    companyFormatter?: (company: string) => string;
    linkedinFormatter?: (url: string) => string;

    // Validation options
    strictValidation?: boolean;
    allowPartialData?: boolean;
    requireEmail?: boolean;
}

export interface MappingResult {
    prospects: ProspectData[];
    errors: MappingError[];
    skippedRows: number;
    totalProcessed: number;
}

export interface MappingError {
    row: number;
    field?: string;
    value?: string;
    error: string;
    originalData: CSVRow;
}

export class DataMapperService {
    private static readonly DEFAULT_CONFIG: Required<Omit<MappingConfig, 'nameFormatter' | 'emailFormatter' | 'companyFormatter' | 'linkedinFormatter'>> = {
        emailColumn: 'email',
        nameColumns: ['name', 'fullname', 'full_name'],
        companyColumns: ['company', 'organization', 'org'],
        positionColumns: ['position', 'title', 'job_title', 'role'],
        linkedinColumns: ['linkedin', 'linkedin_url', 'linkedinurl'],
        strictValidation: true,
        allowPartialData: false,
        requireEmail: true
    };

    /**
     * Map CSV data to prospect format
     */
    static mapProspects(
        csvData: CSVRow[],
        config: Partial<MappingConfig> = {}
    ): MappingResult {
        const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
        const prospects: ProspectData[] = [];
        const errors: MappingError[] = [];
        let skippedRows = 0;

        csvData.forEach((row, index) => {
            const rowNumber = index + 1;

            try {
                // Skip rows marked with errors from parsing
                if (row._hasErrors === 'true') {
                    skippedRows++;
                    return;
                }

                const mappingResult = this.mapSingleRow(row, finalConfig, rowNumber);

                if (mappingResult.prospect) {
                    prospects.push(mappingResult.prospect);
                } else {
                    errors.push(...mappingResult.errors);
                    if (!finalConfig.allowPartialData) {
                        skippedRows++;
                    }
                }
            } catch (error) {
                errors.push({
                    row: rowNumber,
                    error: error instanceof Error ? error.message : 'Unknown mapping error',
                    originalData: row
                });
                skippedRows++;
            }
        });

        return {
            prospects,
            errors,
            skippedRows,
            totalProcessed: csvData.length
        };
    }

    /**
     * Map a single CSV row to prospect data
     */
    private static mapSingleRow(
        row: CSVRow,
        config: Required<Omit<MappingConfig, 'nameFormatter' | 'emailFormatter' | 'companyFormatter' | 'linkedinFormatter'>> & MappingConfig,
        rowNumber: number
    ): { prospect?: ProspectData; errors: MappingError[] } {
        const errors: MappingError[] = [];
        const prospect: Partial<ProspectData> = {};

        // Map email (required field)
        const email = this.findFieldValue(row, [config.emailColumn]);
        if (!email) {
            if (config.requireEmail) {
                errors.push({
                    row: rowNumber,
                    field: 'email',
                    error: `Email is required but not found in columns: ${config.emailColumn}`,
                    originalData: row
                });
                return { errors };
            }
        } else {
            const formattedEmail = config.emailFormatter ?
                config.emailFormatter(email) :
                this.formatEmail(email);

            if (!this.isValidEmail(formattedEmail)) {
                errors.push({
                    row: rowNumber,
                    field: 'email',
                    value: formattedEmail,
                    error: 'Invalid email format',
                    originalData: row
                });

                if (config.strictValidation) {
                    return { errors };
                }
            } else {
                prospect.email = formattedEmail;
            }
        }

        // Map name
        const name = this.mapName(row, config, rowNumber, errors);
        if (name) {
            prospect.name = name;
        }

        // Map company
        const company = this.findFieldValue(row, config.companyColumns);
        if (company) {
            prospect.company = config.companyFormatter ?
                config.companyFormatter(company) :
                this.formatCompany(company);
        }

        // Map position
        const position = this.findFieldValue(row, config.positionColumns);
        if (position) {
            prospect.position = this.formatPosition(position);
        }

        // Map LinkedIn URL
        const linkedinUrl = this.findFieldValue(row, config.linkedinColumns);
        if (linkedinUrl) {
            const formattedLinkedin = config.linkedinFormatter ?
                config.linkedinFormatter(linkedinUrl) :
                this.formatLinkedInUrl(linkedinUrl);

            if (formattedLinkedin && this.isValidLinkedInUrl(formattedLinkedin)) {
                prospect.linkedinUrl = formattedLinkedin;
            } else if (linkedinUrl.trim()) {
                errors.push({
                    row: rowNumber,
                    field: 'linkedinUrl',
                    value: linkedinUrl,
                    error: 'Invalid LinkedIn URL format',
                    originalData: row
                });
            }
        }

        // Collect additional data (all other fields)
        const additionalData: Record<string, any> = {};
        const usedColumns = new Set([
            config.emailColumn,
            ...config.nameColumns,
            ...config.companyColumns,
            ...config.positionColumns,
            ...config.linkedinColumns,
            '_hasErrors'
        ]);

        Object.keys(row).forEach(key => {
            if (!usedColumns.has(key) && row[key] && row[key].trim()) {
                additionalData[key] = row[key].trim();
            }
        });

        if (Object.keys(additionalData).length > 0) {
            prospect.additionalData = additionalData;
        }

        // Return prospect if we have minimum required data
        if (prospect.email || config.allowPartialData) {
            return { prospect: prospect as ProspectData, errors };
        }

        return { errors };
    }

    /**
     * Map name from various column combinations
     */
    private static mapName(
        row: CSVRow,
        config: MappingConfig,
        rowNumber: number,
        errors: MappingError[]
    ): string | undefined {
        // Try to find full name first
        const fullName = this.findFieldValue(row, config.nameColumns || []);
        if (fullName) {
            return config.nameFormatter ?
                config.nameFormatter(undefined, undefined, fullName) :
                this.formatName(fullName);
        }

        // Try to find first and last name separately
        const firstName = this.findFieldValue(row, ['firstname', 'first_name', 'fname']);
        const lastName = this.findFieldValue(row, ['lastname', 'last_name', 'lname']);

        if (firstName || lastName) {
            const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
            return config.nameFormatter ?
                config.nameFormatter(firstName, lastName, combinedName) :
                combinedName;
        }

        return undefined;
    }

    /**
     * Find field value from multiple possible column names
     */
    private static findFieldValue(row: CSVRow, columns: string[]): string | undefined {
        for (const column of columns) {
            const value = row[column.toLowerCase()];
            if (value && value.trim()) {
                return value.trim();
            }
        }
        return undefined;
    }

    /**
     * Format email address
     */
    private static formatEmail(email: string): string {
        return email.toLowerCase().trim();
    }

    /**
     * Format name
     */
    private static formatName(name: string): string {
        return name.trim().replace(/\s+/g, ' ');
    }

    /**
     * Format company name
     */
    private static formatCompany(company: string): string {
        return company.trim().replace(/\s+/g, ' ');
    }

    /**
     * Format position/title
     */
    private static formatPosition(position: string): string {
        return position.trim().replace(/\s+/g, ' ');
    }

    /**
     * Format LinkedIn URL
     */
    private static formatLinkedInUrl(url: string): string {
        let formatted = url.trim();

        // Add protocol if missing
        if (!formatted.startsWith('http')) {
            formatted = 'https://' + formatted;
        }

        // Normalize linkedin.com URLs
        formatted = formatted.replace(/linkedin\.com\/pub\//, 'linkedin.com/in/');

        return formatted;
    }

    /**
     * Validate email format
     */
    private static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate LinkedIn URL format
     */
    private static isValidLinkedInUrl(url: string): boolean {
        const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9-]+\/?$/;
        return linkedinRegex.test(url);
    }

    /**
     * Create default mapping configuration based on CSV headers
     */
    static createMappingConfig(headers: string[]): MappingConfig {
        const lowerHeaders = headers.map(h => h.toLowerCase());

        // Find best email column
        const emailColumn = lowerHeaders.find(h =>
            ['email', 'email_address', 'e-mail', 'mail'].includes(h)
        ) || 'email';

        // Find name columns
        const nameColumns = lowerHeaders.filter(h =>
            ['name', 'fullname', 'full_name', 'contact_name'].includes(h)
        );

        // Find company columns
        const companyColumns = lowerHeaders.filter(h =>
            ['company', 'organization', 'org', 'business', 'employer'].includes(h)
        );

        // Find position columns
        const positionColumns = lowerHeaders.filter(h =>
            ['position', 'title', 'job_title', 'role', 'designation'].includes(h)
        );

        // Find LinkedIn columns
        const linkedinColumns = lowerHeaders.filter(h =>
            ['linkedin', 'linkedin_url', 'linkedinurl', 'linkedin_profile'].includes(h)
        );

        return {
            emailColumn,
            nameColumns: nameColumns.length > 0 ? nameColumns : ['name'],
            companyColumns: companyColumns.length > 0 ? companyColumns : ['company'],
            positionColumns: positionColumns.length > 0 ? positionColumns : ['position'],
            linkedinColumns: linkedinColumns.length > 0 ? linkedinColumns : ['linkedin_url'],
            strictValidation: false,
            allowPartialData: true,
            requireEmail: true
        };
    }

    /**
     * Get mapping statistics
     */
    static getMappingStats(result: MappingResult) {
        return {
            successRate: result.totalProcessed > 0 ?
                ((result.prospects.length) / result.totalProcessed) * 100 : 0,
            errorRate: result.totalProcessed > 0 ?
                (result.errors.length / result.totalProcessed) * 100 : 0,
            skippedRate: result.totalProcessed > 0 ?
                (result.skippedRows / result.totalProcessed) * 100 : 0,
            totalProspects: result.prospects.length,
            totalErrors: result.errors.length,
            fieldsWithErrors: [...new Set(result.errors.map(e => e.field).filter(Boolean))],
            hasRequiredFields: result.prospects.every(p => p.email)
        };
    }

    /**
     * Generate mapping report
     */
    static generateMappingReport(result: MappingResult): string {
        const stats = this.getMappingStats(result);

        let report = `CSV Data Mapping Report\n`;
        report += `=======================\n\n`;
        report += `Total Rows Processed: ${result.totalProcessed}\n`;
        report += `Successfully Mapped: ${result.prospects.length}\n`;
        report += `Skipped Rows: ${result.skippedRows}\n`;
        report += `Mapping Errors: ${result.errors.length}\n`;
        report += `Success Rate: ${stats.successRate.toFixed(2)}%\n\n`;

        if (result.errors.length > 0) {
            report += `Mapping Errors:\n`;
            report += `---------------\n`;

            result.errors.forEach((error, index) => {
                report += `${index + 1}. Row ${error.row}: ${error.error}\n`;
                if (error.field) {
                    report += `   Field: ${error.field}\n`;
                }
                if (error.value) {
                    report += `   Value: "${error.value}"\n`;
                }
                report += `\n`;
            });
        }

        if (stats.fieldsWithErrors.length > 0) {
            report += `Fields with validation issues: ${stats.fieldsWithErrors.join(', ')}\n`;
        }

        return report;
    }
} 