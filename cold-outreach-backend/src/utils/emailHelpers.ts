/**
 * Email utility functions for domain extraction and validation
 */

/**
 * Comprehensive list of free/personal email providers
 * These domains should be skipped when extracting company domains from email addresses
 */
export const FREE_EMAIL_PROVIDERS = [
    // Major providers
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'live.com', 'aol.com', 'protonmail.com',
    'mail.com', 'yandex.com', 'zoho.com', 'mailinator.com',
    'tempmail.org', '10minutemail.com', 'msn.com',

    // US ISP providers
    'comcast.net', 'verizon.net', 'sbcglobal.net', 'att.net',
    'cox.net', 'charter.net', 'earthlink.net', 'juno.com', 'netzero.net',

    // International providers
    'rediffmail.com', 'mail.ru', 'qq.com', '163.com', '126.com',
    'sina.com', 'sohu.com', 'yeah.net', 'foxmail.com', 'gmx.com',
    'web.de', 't-online.de', 'freenet.de', 'arcor.de', 'alice.it',
    'libero.it', 'virgilio.it', 'orange.fr', 'laposte.net', 'free.fr',
    'wanadoo.fr', 'sfr.fr', 'neuf.fr', 'voila.fr', 'tiscali.it',
    'fastwebnet.it', 'tin.it', 'telefonica.net', 'terra.es',
    'ono.com', 'ya.ru', 'rambler.ru', 'list.ru', 'bk.ru',
    'inbox.ru', 'bigmir.net', 'ukr.net', 'i.ua', 'meta.ua'
]

/**
 * Extract domain from email address
 * Returns null if email is invalid or from a free email provider
 */
export function extractDomainFromEmail(email: string): string | null {
    try {
        if (!email || !email.includes('@')) {
            return null
        }

        const emailDomain = email.split('@')[1]?.toLowerCase()
        if (!emailDomain) {
            return null
        }

        // Skip common free email providers
        if (FREE_EMAIL_PROVIDERS.includes(emailDomain)) {
            return null
        }

        // Remove www. prefix if present
        const cleanDomain = emailDomain.replace(/^www\./, '')
        return cleanDomain

    } catch (error) {
        console.error(`❌ [EmailHelpers]: Failed to extract domain from email ${email}:`, error)
        return null
    }
}

/**
 * Check if email domain is a free/personal email provider
 */
export function isFreeEmailProvider(email: string): boolean {
    try {
        if (!email || !email.includes('@')) {
            return false
        }

        const emailDomain = email.split('@')[1]?.toLowerCase()
        if (!emailDomain) {
            return false
        }

        return FREE_EMAIL_PROVIDERS.includes(emailDomain)
    } catch {
        return false
    }
}

/**
 * Extract company website URL from email domain
 * Returns null if email is invalid or from a free email provider
 */
export function extractCompanyWebsiteFromEmail(email: string): string | null {
    const domain = extractDomainFromEmail(email)
    if (!domain) {
        return null
    }

    return `https://www.${domain}`
} 