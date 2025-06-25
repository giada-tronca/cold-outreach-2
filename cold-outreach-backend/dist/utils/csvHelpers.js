"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractProspectFromRow = extractProspectFromRow;
/**
 * Extracts prospect data from a CSV row using common field mappings
 * @param row The CSV row data
 * @returns Extracted prospect data with mapped fields and additional data
 */
function extractProspectFromRow(row) {
    const prospect = {};
    const additionalData = {};
    // Helper function to normalize column names for comparison
    const normalizeColumnName = (name) => {
        return name.toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove spaces, underscores, etc.
    };
    // Flexible field mapping using pattern matching
    const findColumnValue = (row, patterns) => {
        for (const [key, value] of Object.entries(row)) {
            if (value && typeof value === 'string' && value.trim()) {
                const normalizedKey = normalizeColumnName(key);
                for (const pattern of patterns) {
                    const normalizedPattern = normalizeColumnName(pattern);
                    if (normalizedKey.includes(normalizedPattern) || normalizedPattern.includes(normalizedKey)) {
                        return value.trim();
                    }
                }
            }
        }
        return undefined;
    };
    // Extract mapped fields using flexible pattern matching
    prospect.name = findColumnValue(row, ['name', 'fullname', 'full_name', 'contact_name', 'first_name', 'last_name']);
    prospect.email = findColumnValue(row, ['email', 'emails', 'email_address', 'contact_email', 'work_email']);
    prospect.company = findColumnValue(row, ['company', 'company_name', 'organization', 'employer']);
    prospect.position = findColumnValue(row, ['position', 'title', 'job_title', 'role', 'job_role']);
    prospect.linkedinUrl = findColumnValue(row, ['linkedin', 'linkedinurl', 'linkedin_url', 'linkedin_profile', 'linkedin_link']);
    prospect.phone = findColumnValue(row, ['phone', 'phone_number', 'mobile', 'contact_number']);
    prospect.location = findColumnValue(row, ['location', 'city', 'country', 'address']);
    // Store unmapped columns as additional data
    // const mappedKeys = new Set();
    for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'string' && value.trim()) {
            const normalizedKey = normalizeColumnName(key);
            // Check if this key was used for any mapped field
            const isMapped = [
                ['name', 'fullname', 'full_name', 'contact_name', 'first_name', 'last_name'],
                ['email', 'emails', 'email_address', 'contact_email', 'work_email'],
                ['company', 'company_name', 'organization', 'employer'],
                ['position', 'title', 'job_title', 'role', 'job_role'],
                ['linkedin', 'linkedinurl', 'linkedin_url', 'linkedin_profile', 'linkedin_link'],
                ['phone', 'phone_number', 'mobile', 'contact_number'],
                ['location', 'city', 'country', 'address']
            ].some(patterns => patterns.some(pattern => {
                const normalizedPattern = normalizeColumnName(pattern);
                return normalizedKey.includes(normalizedPattern) || normalizedPattern.includes(normalizedKey);
            }));
            if (!isMapped) {
                additionalData[key] = value.trim();
            }
        }
    }
    if (Object.keys(additionalData).length > 0) {
        prospect.additionalData = additionalData;
    }
    console.log('🔍 [CSV Mapping]: Extracted prospect data:', {
        original: Object.keys(row),
        mapped: {
            name: prospect.name,
            email: prospect.email,
            company: prospect.company,
            position: prospect.position,
            linkedinUrl: prospect.linkedinUrl,
            phone: prospect.phone,
            location: prospect.location
        },
        additional: Object.keys(additionalData)
    });
    return prospect;
}
