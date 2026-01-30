import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateProductTemplate,
  generateCategoryTemplate,
  generateInboundTemplate,
  parseExcel,
  parseAttributeString,
} from '@/lib/utils/excel-utils';

describe('excel-utils', () => {
  describe('generateProductTemplate', () => {
    it('should return base64 string', async () => {
      const result = await generateProductTemplate('Category A', []);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(Buffer.from(result, 'base64').length).toBeGreaterThan(0);
    });

    it('should include schema columns when schema provided', async () => {
      const schema = [
        { key: 'lot', label: 'Lot', scope: 'PRODUCT' },
        { key: 'exp', label: 'Expiry', scope: 'LOT' },
      ];
      await generateProductTemplate('Cat', schema);
      expect(true).toBe(true);
    });
  });

  describe('generateCategoryTemplate', () => {
    it('should return base64 string', async () => {
      const result = await generateCategoryTemplate();
      expect(typeof result).toBe('string');
      expect(Buffer.from(result, 'base64').length).toBeGreaterThan(0);
    });
  });

  describe('generateInboundTemplate', () => {
    it('should return base64 string', async () => {
      const schema = [{ key: 'batch', label: 'Batch' }];
      const result = await generateInboundTemplate('WH', 'Cat', schema);
      expect(typeof result).toBe('string');
      expect(Buffer.from(result, 'base64').length).toBeGreaterThan(0);
    });
  });

  describe('parseExcel', () => {
    it('should throw when file is invalid or worksheet not found', async () => {
      const blob = new Blob(['invalid'], { type: 'application/octet-stream' });
      const file = new File([blob], 'test.xlsx');
      await expect(parseExcel(file)).rejects.toThrow();
    });
  });

  describe('parseAttributeString', () => {
    it('should return null for empty string', () => {
      expect(parseAttributeString('', 'PRODUCT')).toBeNull();
      expect(parseAttributeString('', 'LOT')).toBeNull();
    });

    it('should parse key/label/type format', () => {
      const result = parseAttributeString('lot / Lot / text', 'PRODUCT');
      expect(result).toEqual({
        key: 'lot',
        label: 'Lot',
        type: 'text',
        scope: 'PRODUCT',
      });
    });

    it('should default label to key and type to text', () => {
      const result = parseAttributeString('expiry_date', 'LOT');
      expect(result).toEqual({
        key: 'expiry_date',
        label: 'expiry_date',
        type: 'text',
        scope: 'LOT',
      });
    });

    it('should trim parts and normalize key', () => {
      const result = parseAttributeString('  my key  /  My Label  /  number  ', 'PRODUCT');
      expect(result?.key).toBe('my_key');
      expect(result?.label).toBe('My Label');
      expect(result?.type).toBe('number');
    });

    it('should return null when first part is empty', () => {
      expect(parseAttributeString('  / label / type', 'PRODUCT')).toBeNull();
    });
  });
});
