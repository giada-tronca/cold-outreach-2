/**
 * Validates if a string is a valid email address format
 * @param email The email address to validate
 * @returns boolean indicating if the email is valid
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
} 