// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { cn, isValidUUID, formatAttributeKey, formatAttributeValue } from '@/lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

describe('utils', () => {
  describe('cn', () => {
    it('should merge classes correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
      expect(cn('px-2 py-2', 'p-4')).toBe('p-4'); // tailwind-merge test
    });
  });

  describe('isValidUUID', () => {
    it('should validate valid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('UUID-WITH-UPPERCASE-LETTERS')).toBe(false); // Validating actual logic regex
    });

    it('should validate invalid UUIDs', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('formatAttributeKey', () => {
    it('should map known keys correctly', () => {
      expect(formatAttributeKey('lot')).toBe('Lot No.');
      expect(formatAttributeKey('mfg')).toBe('Mfg. Date');
      expect(formatAttributeKey('qty')).toBe('Quantity');
    });

    it('should be case-insensitive for known keys', () => {
      expect(formatAttributeKey('LOT')).toBe('Lot No.');
      expect(formatAttributeKey('Lot')).toBe('Lot No.');
      expect(formatAttributeKey('BATCH')).toBe('Batch');
    });

    it('should format snake_case keys', () => {
      expect(formatAttributeKey('user_id')).toBe('User Id');
      expect(formatAttributeKey('created_at')).toBe('Created At');
    });

    it('should format kebab-case keys', () => {
      expect(formatAttributeKey('some-key')).toBe('Some Key');
    });

    it('should format camelCase keys', () => {
      expect(formatAttributeKey('userName')).toBe('User Name');
    });
  });

  describe('formatAttributeValue', () => {
    it('should handle null/undefined', () => {
      expect(formatAttributeValue(null)).toBe('-');
      expect(formatAttributeValue(undefined)).toBe('-');
    });

    it('should format dates correctly', () => {
      const date = '2023-12-25';
      const formatted = format(new Date(date), 'dd MMM yyyy', { locale: th });
      expect(formatAttributeValue(date)).toBe(formatted);

      const isoDate = '2023-12-25T10:00:00.000Z';
      const formattedIso = format(new Date(isoDate), 'dd MMM yyyy', { locale: th });
      expect(formatAttributeValue(isoDate)).toBe(formattedIso);
    });

    it('should format booleans', () => {
      expect(formatAttributeValue(true)).toBe('Yes');
      expect(formatAttributeValue(false)).toBe('No');
    });

    it('should format other types as string', () => {
      expect(formatAttributeValue(123)).toBe('123');
      expect(formatAttributeValue('some string')).toBe('some string');
    });

    it('should return string as-is when date regex matches but date is invalid', () => {
      // Matches YYYY-MM-DD but invalid month/day - isValid(date) is false, fall through
      expect(formatAttributeValue('2023-13-01')).toBe('2023-13-01');
      expect(formatAttributeValue('2023-02-30')).toBe('2023-02-30');
    });
  });
});
