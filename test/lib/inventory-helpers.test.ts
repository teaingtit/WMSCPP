// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  prepareLocationIdsForQuery,
  isHeadersOverflowError,
  formatInventoryError,
  formatSupabaseError,
  transformStockForUI,
  buildAttributeLabelMap,
  MAX_LOCATION_IDS,
  EMPTY_LOCATION_SENTINEL,
} from '@/lib/inventory-helpers';

describe('inventory-helpers', () => {
  describe('prepareLocationIdsForQuery', () => {
    it('should return sentinel UUID when location IDs array is empty', () => {
      const result = prepareLocationIdsForQuery([]);

      expect(result.ids).toEqual([EMPTY_LOCATION_SENTINEL]);
      expect(result.isEmpty).toBe(true);
      expect(result.wasCapped).toBe(false);
      expect(result.originalCount).toBe(0);
    });

    it('should return all IDs when count is below MAX_LOCATION_IDS', () => {
      const locationIds = ['loc-1', 'loc-2', 'loc-3'];
      const result = prepareLocationIdsForQuery(locationIds);

      expect(result.ids).toEqual(locationIds);
      expect(result.isEmpty).toBe(false);
      expect(result.wasCapped).toBe(false);
      expect(result.originalCount).toBe(3);
    });

    it('should return exactly MAX_LOCATION_IDS when count equals limit', () => {
      const locationIds = Array.from({ length: MAX_LOCATION_IDS }, (_, i) => `loc-${i}`);
      const result = prepareLocationIdsForQuery(locationIds);

      expect(result.ids.length).toBe(MAX_LOCATION_IDS);
      expect(result.wasCapped).toBe(false);
      expect(result.originalCount).toBe(MAX_LOCATION_IDS);
    });

    it('should cap IDs and set wasCapped when count exceeds MAX_LOCATION_IDS', () => {
      const locationIds = Array.from({ length: MAX_LOCATION_IDS + 500 }, (_, i) => `loc-${i}`);
      const result = prepareLocationIdsForQuery(locationIds);

      expect(result.ids.length).toBe(MAX_LOCATION_IDS);
      expect(result.wasCapped).toBe(true);
      expect(result.originalCount).toBe(MAX_LOCATION_IDS + 500);
      expect(result.isEmpty).toBe(false);
    });

    it('should preserve order when capping', () => {
      const locationIds = Array.from({ length: MAX_LOCATION_IDS + 100 }, (_, i) => `loc-${i}`);
      const result = prepareLocationIdsForQuery(locationIds);

      expect(result.ids[0]).toBe('loc-0');
      expect(result.ids[MAX_LOCATION_IDS - 1]).toBe(`loc-${MAX_LOCATION_IDS - 1}`);
    });
  });

  describe('isHeadersOverflowError', () => {
    it('should return false for null/undefined', () => {
      expect(isHeadersOverflowError(null)).toBe(false);
      expect(isHeadersOverflowError(undefined)).toBe(false);
    });

    it('should return false for regular errors', () => {
      expect(isHeadersOverflowError({ message: 'Database connection failed' })).toBe(false);
      expect(isHeadersOverflowError({ message: 'Permission denied' })).toBe(false);
    });

    it('should detect "headers overflow" in message', () => {
      expect(isHeadersOverflowError({ message: 'Request failed: headers overflow' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'Headers Overflow detected' })).toBe(true);
    });

    it('should detect "UND_ERR_HEADERS_OVERFLOW" in message', () => {
      expect(isHeadersOverflowError({ message: 'UND_ERR_HEADERS_OVERFLOW' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'Error: UND_ERR_HEADERS_OVERFLOW occurred' })).toBe(
        true,
      );
    });

    it('should detect "fetch failed" in message', () => {
      expect(isHeadersOverflowError({ message: 'fetch failed' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'TypeError: fetch failed' })).toBe(true);
    });

    it('should detect patterns in details field', () => {
      expect(isHeadersOverflowError({ message: 'Error', details: 'headers overflow' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'Error', details: 'ECONNRESET' })).toBe(true);
    });

    it('should detect network-related errors', () => {
      expect(isHeadersOverflowError({ message: 'ECONNRESET' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'socket hang up' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'network error' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'request aborted' })).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isHeadersOverflowError({ message: 'HEADERS OVERFLOW' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'Fetch Failed' })).toBe(true);
      expect(isHeadersOverflowError({ message: 'Network Error' })).toBe(true);
    });
  });

  describe('formatInventoryError', () => {
    it('should format Error instances', () => {
      const error = new Error('Test error message');
      const result = formatInventoryError(error);

      expect(result.message).toBe('Test error message');
      expect(result.details).toBeUndefined();
      expect(result.isHeadersOverflow).toBe(false);
    });

    it('should extract details from Error with details property', () => {
      const error = new Error('Test error');
      (error as any).details = 'Additional details here';
      const result = formatInventoryError(error);

      expect(result.message).toBe('Test error');
      expect(result.details).toBe('Additional details here');
    });

    it('should format plain objects with message property', () => {
      const error = { message: 'Object error', details: 'Object details' };
      const result = formatInventoryError(error);

      expect(result.message).toBe('Object error');
      expect(result.details).toBe('Object details');
    });

    it('should convert non-object errors to string', () => {
      expect(formatInventoryError('string error').message).toBe('string error');
      expect(formatInventoryError(123).message).toBe('123');
    });

    it('should detect headers overflow in formatted error', () => {
      const error = new Error('UND_ERR_HEADERS_OVERFLOW');
      const result = formatInventoryError(error);

      expect(result.isHeadersOverflow).toBe(true);
    });

    it('should detect headers overflow in details', () => {
      const error = { message: 'Request failed', details: 'fetch failed' };
      const result = formatInventoryError(error);

      expect(result.isHeadersOverflow).toBe(true);
    });
  });

  describe('formatSupabaseError', () => {
    it('should return null for null input', () => {
      expect(formatSupabaseError(null)).toBeNull();
    });

    it('should format Supabase error object', () => {
      const error = {
        message: 'Database error',
        details: 'Connection timeout',
        code: 'PGRST301',
      };
      const result = formatSupabaseError(error);

      expect(result).not.toBeNull();
      expect(result!.message).toBe('Database error');
      expect(result!.details).toBe('Connection timeout');
    });

    it('should provide default message when missing', () => {
      const error = { code: 'ERROR' };
      const result = formatSupabaseError(error);

      expect(result!.message).toBe('Unknown database error');
    });

    it('should detect headers overflow in Supabase errors', () => {
      const error = { message: 'headers overflow', code: 'ERROR' };
      const result = formatSupabaseError(error);

      expect(result!.isHeadersOverflow).toBe(true);
    });

    it('should handle undefined details', () => {
      const error = { message: 'Error', details: undefined };
      const result = formatSupabaseError(error);

      expect(result!.details).toBeUndefined();
    });

    it('should ignore non-string details', () => {
      const error = { message: 'Error', details: { nested: 'object' } as any };
      const result = formatSupabaseError(error);

      expect(result!.details).toBeUndefined();
    });
  });

  describe('transformStockForUI', () => {
    const defaultOptions = { attributeLabelMap: {} };

    it('should map products to product (singular)', () => {
      const stock = {
        id: 'stock-1',
        products: { sku: 'SKU001', name: 'Product 1' },
        locations: { lot: 'A', cart: '01', level: 1 },
      };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.product).toEqual({ sku: 'SKU001', name: 'Product 1' });
      expect(result.products).toEqual({ sku: 'SKU001', name: 'Product 1' }); // Original preserved
    });

    it('should map locations to location (singular)', () => {
      const stock = {
        id: 'stock-1',
        products: {},
        locations: { lot: 'A', cart: '01', level: 1 },
      };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.location).toEqual({ lot: 'A', cart: '01', level: 1 });
    });

    it('should flatten nested location properties', () => {
      const stock = {
        id: 'stock-1',
        products: {},
        locations: { lot: 'B', cart: '02', level: 3 },
      };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.lot).toBe('B');
      expect(result.cart).toBe('02');
      expect(result.level).toBe(3);
    });

    it('should flatten nested product properties', () => {
      const stock = {
        id: 'stock-1',
        products: { sku: 'SKU002', name: 'Test Product', image_url: 'http://example.com/img.jpg' },
        locations: {},
      };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.sku).toBe('SKU002');
      expect(result.name).toBe('Test Product');
      expect(result.image_url).toBe('http://example.com/img.jpg');
    });

    it('should convert id to string', () => {
      const stock = { id: 12345, products: {}, locations: {} };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.id).toBe('12345');
      expect(typeof result.id).toBe('string');
    });

    it('should resolve attribute keys to labels', () => {
      const stock = {
        id: 'stock-1',
        attributes: { exp_date: '2025-12-31', batch_no: 'B001' },
        products: {},
        locations: {},
      };
      const options = {
        attributeLabelMap: {
          exp_date: 'Expiry Date',
          batch_no: 'Batch Number',
        },
      };

      const result = transformStockForUI(stock, options);

      expect(result.attributes).toEqual({
        'Expiry Date': '2025-12-31',
        'Batch Number': 'B001',
      });
    });

    it('should preserve original key when no label mapping exists', () => {
      const stock = {
        id: 'stock-1',
        attributes: { custom_field: 'value' },
        products: {},
        locations: {},
      };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.attributes).toEqual({ custom_field: 'value' });
    });

    it('should handle null/undefined attributes', () => {
      const stock = {
        id: 'stock-1',
        attributes: null,
        products: {},
        locations: {},
      };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.attributes).toEqual({});
    });

    it('should handle missing nested objects gracefully', () => {
      const stock = { id: 'stock-1' };

      const result = transformStockForUI(stock, defaultOptions);

      expect(result.product).toBeUndefined();
      expect(result.location).toBeUndefined();
      expect(result.lot).toBeUndefined();
      expect(result.sku).toBeUndefined();
    });
  });

  describe('buildAttributeLabelMap', () => {
    it('should return empty object for empty categories array', () => {
      expect(buildAttributeLabelMap([])).toEqual({});
    });

    it('should extract key-label pairs from form_schema', () => {
      const categories = [
        {
          form_schema: [
            { key: 'exp_date', label: 'Expiry Date' },
            { key: 'batch', label: 'Batch Number' },
          ],
        },
      ];

      const result = buildAttributeLabelMap(categories);

      expect(result).toEqual({
        exp_date: 'Expiry Date',
        batch: 'Batch Number',
      });
    });

    it('should merge labels from multiple categories', () => {
      const categories = [
        { form_schema: [{ key: 'field1', label: 'Label 1' }] },
        { form_schema: [{ key: 'field2', label: 'Label 2' }] },
      ];

      const result = buildAttributeLabelMap(categories);

      expect(result).toEqual({
        field1: 'Label 1',
        field2: 'Label 2',
      });
    });

    it('should skip entries without key or label', () => {
      const categories = [
        {
          form_schema: [
            { key: 'valid', label: 'Valid Label' },
            { key: 'no_label' },
            { label: 'No Key' },
            {},
          ],
        },
      ];

      const result = buildAttributeLabelMap(categories);

      expect(result).toEqual({ valid: 'Valid Label' });
    });

    it('should handle categories without form_schema', () => {
      const categories = [{ name: 'Category without schema' }, { form_schema: null }];

      const result = buildAttributeLabelMap(categories as any);

      expect(result).toEqual({});
    });

    it('should handle non-array form_schema', () => {
      const categories = [{ form_schema: 'not an array' as any }];

      const result = buildAttributeLabelMap(categories);

      expect(result).toEqual({});
    });

    it('should override duplicate keys with later values', () => {
      const categories = [
        { form_schema: [{ key: 'dup', label: 'First Label' }] },
        { form_schema: [{ key: 'dup', label: 'Second Label' }] },
      ];

      const result = buildAttributeLabelMap(categories);

      expect(result.dup).toBe('Second Label');
    });
  });

  describe('constants', () => {
    it('MAX_LOCATION_IDS should be 2000', () => {
      expect(MAX_LOCATION_IDS).toBe(2000);
    });

    it('EMPTY_LOCATION_SENTINEL should be a valid nil UUID', () => {
      expect(EMPTY_LOCATION_SENTINEL).toBe('00000000-0000-0000-0000-000000000000');
    });
  });
});
