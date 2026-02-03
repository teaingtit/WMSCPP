import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchQuery,
  isValidSearchQuery,
  formatSearchQuery,
  highlightMatches,
  parseThaiDateToISO,
} from '@/lib/search-utils';

describe('search-utils', () => {
  describe('sanitizeSearchQuery', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizeSearchQuery('')).toBe('');
    });

    it('trims whitespace', () => {
      expect(sanitizeSearchQuery('  abc  ')).toBe('abc');
    });

    it('replaces multiple spaces with single space', () => {
      expect(sanitizeSearchQuery('a   b   c')).toBe('a b c');
    });

    it('removes special characters that break tsquery', () => {
      expect(sanitizeSearchQuery('hello!@#$%^&*()')).toBe('hello');
    });

    it('preserves alphanumeric and spaces', () => {
      expect(sanitizeSearchQuery('SKU-001 product')).toBe('SKU-001 product');
    });

    it('preserves Thai characters', () => {
      expect(sanitizeSearchQuery(' สินค้า  ')).toBe('สินค้า');
    });

    it('strips pipe and other tsquery-unsafe chars', () => {
      expect(sanitizeSearchQuery('a|b&c')).toBe('abc');
    });
  });

  describe('isValidSearchQuery', () => {
    it('returns false for empty or whitespace', () => {
      expect(isValidSearchQuery('')).toBe(false);
      expect(isValidSearchQuery('   ')).toBe(false);
    });

    it('returns false for single character', () => {
      expect(isValidSearchQuery('a')).toBe(false);
    });

    it('returns true for 2+ characters after sanitize', () => {
      expect(isValidSearchQuery('ab')).toBe(true);
      expect(isValidSearchQuery('ABC')).toBe(true);
      expect(isValidSearchQuery('  xy  ')).toBe(true);
    });

    it('returns false when sanitized result is under 2 chars', () => {
      expect(isValidSearchQuery('!')).toBe(false);
    });
  });

  describe('formatSearchQuery', () => {
    it('returns empty string for empty input', () => {
      expect(formatSearchQuery('')).toBe('');
    });

    it('returns sanitized query', () => {
      expect(formatSearchQuery('  test  product  ')).toBe('test product');
    });
  });

  describe('highlightMatches', () => {
    it('returns original text when text or query is empty', () => {
      expect(highlightMatches('', 'q')).toBe('');
      expect(highlightMatches('hello', '')).toBe('hello');
    });

    it('wraps matching words in <mark>', () => {
      expect(highlightMatches('Hello world', 'world')).toBe('Hello <mark>world</mark>');
    });

    it('handles multiple words in query', () => {
      const text = 'The quick brown fox';
      expect(highlightMatches(text, 'quick fox')).toBe(
        'The <mark>quick</mark> brown <mark>fox</mark>',
      );
    });

    it('is case insensitive', () => {
      expect(highlightMatches('Hello World', 'world')).toBe('Hello <mark>World</mark>');
    });

    it('sanitizes query before matching', () => {
      expect(highlightMatches('Hello world', '  world  ')).toBe('Hello <mark>world</mark>');
    });
  });

  describe('parseThaiDateToISO', () => {
    it('returns null for empty input', () => {
      expect(parseThaiDateToISO('')).toBe(null);
    });

    it('parses DD/MM/YYYY format', () => {
      expect(parseThaiDateToISO('1/1/2024')).toBe('2024-01-01');
      expect(parseThaiDateToISO('25/12/2023')).toBe('2023-12-25');
    });

    it('passes through ISO date string', () => {
      expect(parseThaiDateToISO('2024-01-15')).toBe('2024-01-15');
      expect(parseThaiDateToISO('2024-01-15T10:00:00Z')).toBe('2024-01-15');
    });

    it('returns null for invalid format', () => {
      expect(parseThaiDateToISO('invalid')).toBe(null);
      expect(parseThaiDateToISO('not-a-date')).toBe(null);
    });
  });
});
