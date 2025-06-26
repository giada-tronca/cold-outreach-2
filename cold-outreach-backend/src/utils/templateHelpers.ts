/**
 * Template variable replacement utilities for AI prompts
 * Ensures consistent variable substitution across all AI API calls
 */

export interface TemplateVariables {
    // LinkedIn Summary Variable
    LINKEDIN_PROFILE_DATA?: string;

    // Company summary variable (matches database prompt)
    WEBSITE_CONTENT?: string;
    WEBSITE_PAGES_CONTENT?: string;

    // Builtwith summary variable (matches database prompt)
    BUILTWITH_RAW_MD_DATA?: string;
    BUILTWITH_INFO?: string;

    // Prospect Analysis summary variables
    SELF_COMPANY_INFO?: string;
    LINKEDIN_INFO?: string;
    FIRECRAWL_INFO?: string;
}

/**
 * Replace template variables in prompt with actual data
 * Handles all the standardized template variables consistently
 */
export function replaceTemplateVariables(prompt: string, variables: TemplateVariables): string {
    let processedPrompt = prompt;

    // Replace LinkedIn Summary Variable
    if (variables.LINKEDIN_PROFILE_DATA !== undefined) {
        processedPrompt = processedPrompt.replace(/\{\$LINKEDIN_PROFILE_DATA\}/g, variables.LINKEDIN_PROFILE_DATA);
    }

    // Replace Company summary variable (matches database prompt)
    if (variables.WEBSITE_CONTENT !== undefined) {
        processedPrompt = processedPrompt.replace(/\$\{WEBSITE_CONTENT\}/g, variables.WEBSITE_CONTENT);
    }
    if (variables.WEBSITE_PAGES_CONTENT !== undefined) {
        processedPrompt = processedPrompt.replace(/\$\{WEBSITE_PAGES_CONTENT\}/g, variables.WEBSITE_PAGES_CONTENT);
    }

    // Replace Builtwith summary variable (matches database prompt)
    if (variables.BUILTWITH_RAW_MD_DATA !== undefined) {
        processedPrompt = processedPrompt.replace(/\{\$BUILTWITH_RAW_MD_DATA\}/g, variables.BUILTWITH_RAW_MD_DATA);
    }
    if (variables.BUILTWITH_INFO !== undefined) {
        processedPrompt = processedPrompt.replace(/\$\{BUILTWITH_INFO\}/g, variables.BUILTWITH_INFO);
    }

    // Replace Prospect Analysis summary variables
    if (variables.SELF_COMPANY_INFO !== undefined) {
        processedPrompt = processedPrompt.replace(/\$\{SELF_COMPANY_INFO\}/g, variables.SELF_COMPANY_INFO);
    }

    if (variables.LINKEDIN_INFO !== undefined) {
        processedPrompt = processedPrompt.replace(/\$\{LINKEDIN_INFO\}/g, variables.LINKEDIN_INFO);
    }

    if (variables.FIRECRAWL_INFO !== undefined) {
        processedPrompt = processedPrompt.replace(/\$\{FIRECRAWL_INFO\}/g, variables.FIRECRAWL_INFO);
    }

    return processedPrompt;
}

/**
 * Legacy template variable replacement for backward compatibility
 * Handles old template variable formats that may still exist
 */
export function replaceLegacyTemplateVariables(prompt: string, variables: Record<string, string>): string {
    let processedPrompt = prompt;

    // Handle legacy formats
    Object.entries(variables).forEach(([key, value]) => {
        // Replace ${key} format
        processedPrompt = processedPrompt.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);

        // Replace {{key}} format
        processedPrompt = processedPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);

        // Replace {key} format
        processedPrompt = processedPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    return processedPrompt;
} 