import csvParser from 'csv-parser';
import fs from 'fs';
import { Readable } from 'stream';
import { AppError, BadRequestError } from '@/utils/errors';

export interface CSVRow {
    [key: string]: string;
}

export interface CSVParseOptions {
    skipEmptyLines?: boolean;
    skipLinesWithError?: boolean;
    maxFileSize?: number; // in bytes
    expectedHeaders?: string[];
    delimiter?: string;
    encoding?: string;
}

export interface CSVParseResult {
    data: CSVRow[];
    errors: CSVParseError[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
    headers: string[];
}

export interface CSVParseError {
    row: number;
    column?: string;
    value?: string;
    error: string;
    rawData?: any;
}

export class CSVParserService {
    private static readonly DEFAULT_OPTIONS: Required<CSVParseOptions> = {
        skipEmptyLines: true,
        skipLinesWithError: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB default
        expectedHeaders: [],
        delimiter: ',',
        encoding: 'utf8'
    };

    /**
     * Parse CSV file from file path
     */
    static async parseFromFile(
        filePath: string,
        options: CSVParseOptions = {}
    ): Promise<CSVParseResult> {
        try {
            // Check file exists and size
            const stats = fs.statSync(filePath);
            const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

            if (stats.size > finalOptions.maxFileSize) {
                throw new BadRequestError(
                    `File size ${stats.size} exceeds maximum allowed size of ${finalOptions.maxFileSize} bytes`
                );
            }

            const fileStream = fs.createReadStream(filePath, {
                encoding: finalOptions.encoding as BufferEncoding
            });

            return this.parseFromStream(fileStream, finalOptions);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new BadRequestError(
                `Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Parse CSV from buffer
     */
    static async parseFromBuffer(
        buffer: Buffer,
        options: CSVParseOptions = {}
    ): Promise<CSVParseResult> {
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

        if (buffer.length > finalOptions.maxFileSize) {
            throw new BadRequestError(
                `Buffer size ${buffer.length} exceeds maximum allowed size of ${finalOptions.maxFileSize} bytes`
            );
        }

        const stream = Readable.from(buffer.toString(finalOptions.encoding as BufferEncoding));
        return this.parseFromStream(stream, finalOptions);
    }

    /**
     * Parse CSV from stream
     */
    private static async parseFromStream(
        stream: Readable,
        options: Required<CSVParseOptions>
    ): Promise<CSVParseResult> {
        return new Promise((resolve, reject) => {
            const results: CSVRow[] = [];
            const errors: CSVParseError[] = [];
            let headers: string[] = [];
            let totalRows = 0;
            let validRows = 0;
            // Processing rows...

            const parser = csvParser({
                separator: options.delimiter,
                mapHeaders: ({ header }) => header.trim().toLowerCase()
            });

            parser.on('headers', (headerList: string[]) => {
                headers = headerList;

                // Validate expected headers if provided
                if (options.expectedHeaders.length > 0) {
                    const missingHeaders = options.expectedHeaders.filter(
                        expectedHeader => !headerList.includes(expectedHeader.toLowerCase())
                    );

                    if (missingHeaders.length > 0) {
                        errors.push({
                            row: 0,
                            error: `Missing required headers: ${missingHeaders.join(', ')}`,
                            rawData: headerList
                        });
                    }
                }
            });

            parser.on('data', (data: CSVRow) => {
                totalRows++;

                try {
                    // Validate row data
                    const validationResult = this.validateRow(data, headers, totalRows);

                    if (validationResult.isValid) {
                        results.push(data);
                        validRows++;
                    } else {
                        errors.push(...validationResult.errors);

                        if (!options.skipLinesWithError) {
                            // Include invalid row in results with error flag
                            results.push({ ...data, _hasErrors: 'true' });
                        }
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
                    errors.push({
                        row: totalRows,
                        error: errorMessage,
                        rawData: data
                    });

                    if (!options.skipLinesWithError) {
                        results.push({ ...data, _hasErrors: 'true' });
                    }
                }
            });

            parser.on('error', (error: Error) => {
                errors.push({
                    row: totalRows + 1,
                    error: `Parse error: ${error.message}`,
                    rawData: null
                });
            });

            parser.on('end', () => {
                const result: CSVParseResult = {
                    data: results,
                    errors,
                    totalRows,
                    validRows,
                    invalidRows: totalRows - validRows,
                    headers
                };

                resolve(result);
            });

            stream.pipe(parser);

            // Handle stream errors
            stream.on('error', (error) => {
                reject(new BadRequestError(
                    `Stream error: ${error.message}`
                ));
            });
        });
    }

    /**
     * Validate individual row data
     */
    private static validateRow(
        data: CSVRow,
        headers: string[],
        rowNumber: number
    ): { isValid: boolean; errors: CSVParseError[] } {
        const errors: CSVParseError[] = [];

        // Check for empty rows
        const hasContent = headers.some(header => {
            const value = data[header];
            return value && value.trim().length > 0;
        });

        if (!hasContent) {
            errors.push({
                row: rowNumber,
                error: 'Empty row detected',
                rawData: data
            });
        }

        // Validate email format if email column exists
        if (data.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email.trim())) {
                errors.push({
                    row: rowNumber,
                    column: 'email',
                    value: data.email,
                    error: 'Invalid email format',
                    rawData: data
                });
            }
        }

        // Validate LinkedIn URL format if provided
        if (data.linkedinurl || data.linkedin_url || data.linkedin) {
            const linkedinUrl = data.linkedinurl || data.linkedin_url || data.linkedin;
            const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9-]+\/?$/;

            if (linkedinUrl && !linkedinRegex.test(linkedinUrl.trim())) {
                errors.push({
                    row: rowNumber,
                    column: 'linkedin_url',
                    value: linkedinUrl,
                    error: 'Invalid LinkedIn URL format',
                    rawData: data
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get CSV parsing statistics
     */
    static getParsingStats(result: CSVParseResult) {
        return {
            successRate: result.totalRows > 0 ? (result.validRows / result.totalRows) * 100 : 0,
            errorRate: result.totalRows > 0 ? (result.invalidRows / result.totalRows) * 100 : 0,
            totalErrors: result.errors.length,
            criticalErrors: result.errors.filter(e => e.row === 0).length,
            rowErrors: result.errors.filter(e => e.row > 0).length
        };
    }

    /**
     * Generate error report
     */
    static generateErrorReport(result: CSVParseResult): string {
        if (result.errors.length === 0) {
            return 'No errors found in CSV file.';
        }

        let report = `CSV Parsing Error Report\n`;
        report += `========================\n\n`;
        report += `Total Rows: ${result.totalRows}\n`;
        report += `Valid Rows: ${result.validRows}\n`;
        report += `Invalid Rows: ${result.invalidRows}\n`;
        report += `Total Errors: ${result.errors.length}\n\n`;

        report += `Errors:\n`;
        report += `--------\n`;

        result.errors.forEach((error, index) => {
            report += `${index + 1}. Row ${error.row}: ${error.error}\n`;
            if (error.column) {
                report += `   Column: ${error.column}\n`;
            }
            if (error.value) {
                report += `   Value: "${error.value}"\n`;
            }
            report += `\n`;
        });

        return report;
    }
} 