"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVParserService = void 0;
const csv_parser_1 = __importDefault(require("csv-parser"));
const fs_1 = __importDefault(require("fs"));
const stream_1 = require("stream");
const errors_1 = require("@/utils/errors");
class CSVParserService {
    /**
     * Parse CSV file from file path
     */
    static async parseFromFile(filePath, options = {}) {
        try {
            // Check file exists and size
            const stats = fs_1.default.statSync(filePath);
            const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
            if (stats.size > finalOptions.maxFileSize) {
                throw new errors_1.BadRequestError(`File size ${stats.size} exceeds maximum allowed size of ${finalOptions.maxFileSize} bytes`);
            }
            const fileStream = fs_1.default.createReadStream(filePath, {
                encoding: finalOptions.encoding
            });
            return this.parseFromStream(fileStream, finalOptions);
        }
        catch (error) {
            if (error instanceof errors_1.AppError)
                throw error;
            throw new errors_1.BadRequestError(`Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse CSV from buffer
     */
    static async parseFromBuffer(buffer, options = {}) {
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
        if (buffer.length > finalOptions.maxFileSize) {
            throw new errors_1.BadRequestError(`Buffer size ${buffer.length} exceeds maximum allowed size of ${finalOptions.maxFileSize} bytes`);
        }
        const stream = stream_1.Readable.from(buffer.toString(finalOptions.encoding));
        return this.parseFromStream(stream, finalOptions);
    }
    /**
     * Parse CSV from stream
     */
    static async parseFromStream(stream, options) {
        return new Promise((resolve, reject) => {
            const results = [];
            const errors = [];
            let headers = [];
            let totalRows = 0;
            let validRows = 0;
            // Processing rows...
            const parser = (0, csv_parser_1.default)({
                separator: options.delimiter,
                mapHeaders: ({ header }) => header.trim().toLowerCase()
            });
            parser.on('headers', (headerList) => {
                headers = headerList;
                // Validate expected headers if provided
                if (options.expectedHeaders.length > 0) {
                    const missingHeaders = options.expectedHeaders.filter(expectedHeader => !headerList.includes(expectedHeader.toLowerCase()));
                    if (missingHeaders.length > 0) {
                        errors.push({
                            row: 0,
                            error: `Missing required headers: ${missingHeaders.join(', ')}`,
                            rawData: headerList
                        });
                    }
                }
            });
            parser.on('data', (data) => {
                totalRows++;
                try {
                    // Validate row data
                    const validationResult = this.validateRow(data, headers, totalRows);
                    if (validationResult.isValid) {
                        results.push(data);
                        validRows++;
                    }
                    else {
                        errors.push(...validationResult.errors);
                        if (!options.skipLinesWithError) {
                            // Include invalid row in results with error flag
                            results.push({ ...data, _hasErrors: 'true' });
                        }
                    }
                }
                catch (error) {
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
            parser.on('error', (error) => {
                errors.push({
                    row: totalRows + 1,
                    error: `Parse error: ${error.message}`,
                    rawData: null
                });
            });
            parser.on('end', () => {
                const result = {
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
                reject(new errors_1.BadRequestError(`Stream error: ${error.message}`));
            });
        });
    }
    /**
     * Validate individual row data
     */
    static validateRow(data, headers, rowNumber) {
        const errors = [];
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
    static getParsingStats(result) {
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
    static generateErrorReport(result) {
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
exports.CSVParserService = CSVParserService;
CSVParserService.DEFAULT_OPTIONS = {
    skipEmptyLines: true,
    skipLinesWithError: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    expectedHeaders: [],
    delimiter: ',',
    encoding: 'utf8'
};
