/**
 * Reusable validation utilities for Saathi backend.
 */

/**
 * Validates that an ID is a valid 24-character hexadecimal MongoDB/Prisma ObjectId.
 */
export const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitizes user text input: strips HTML tags, normalizes whitespace, and truncates to maxLength.
 */
export const sanitizeText = (input: any, maxLength = 1000): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
};
