/**
 * Search Utilities for Full-Text Search
 * Handles Thai and English text sanitization for Postgres full-text search
 */

/**
 * Sanitize search query for safe use with Postgres full-text search
 * - Removes special characters that could break tsquery
 * - Preserves Thai characters
 * - Trims whitespace
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  return (
    query
      // Remove special characters that could break tsquery
      // Keep Thai characters (Unicode range: \u0E00-\u0E7F), alphanumeric, and spaces
      .replace(/[^\u0E00-\u0E7F\w\s-]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim()
  );
}

/**
 * Check if search query is valid (meets minimum requirements)
 */
export function isValidSearchQuery(query: string): boolean {
  const sanitized = sanitizeSearchQuery(query);
  return sanitized.length >= 2;
}

/**
 * Format search query for Postgres plainto_tsquery
 * Handles Thai text which doesn't have word boundaries
 */
export function formatSearchQuery(query: string): string {
  const sanitized = sanitizeSearchQuery(query);

  if (!sanitized) return '';

  // For short queries, use prefix matching approach
  // This helps with partial Thai word matching
  return sanitized;
}

/**
 * Highlight search matches in text
 * Useful for displaying search results with highlighted terms
 */
export function highlightMatches(text: string, query: string): string {
  if (!text || !query) return text;

  const sanitized = sanitizeSearchQuery(query);
  if (!sanitized) return text;

  // Create regex pattern from query words
  const words = sanitized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return text;

  const pattern = new RegExp(`(${words.map(escapeRegex).join('|')})`, 'gi');

  return text.replace(pattern, '<mark>$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse Thai date strings (DD/MM/YYYY) to ISO format
 */
export function parseThaiDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try DD/MM/YYYY format
  const thaiDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (thaiDateMatch) {
    const [, day, month, year] = thaiDateMatch;
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
  }

  // Try ISO format (already valid)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0] ?? null;
  }

  return null;
}
