// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateInventorySummary,
  generateTransactionSummary,
} from '@/lib/reports/inventory-report';
import type { SupabaseClient } from '@supabase/supabase-js';

function createChainableMock(resolved: any) {
  const chain: any = {
    select: vi.fn(function () {
      return chain;
    }),
    eq: vi.fn(function () {
      return chain;
    }),
    gte: vi.fn(function () {
      return chain;
    }),
    lte: vi.fn(function () {
      return chain;
    }),
    single: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    then: (onFulfilled: any) => Promise.resolve(resolved).then(onFulfilled),
    catch: (onRejected: any) => Promise.resolve(resolved).catch(onRejected),
  };
  return chain;
}

function createCountMock(count: number) {
  const chain: any = {
    select: vi.fn(function () {
      return chain;
    }),
    eq: vi.fn(function () {
      return chain;
    }),
    then: (onFulfilled: any) => Promise.resolve({ count, error: null }).then((r) => onFulfilled(r)),
    catch: (onRejected: any) => Promise.resolve({ count, error: null }).catch(onRejected),
  };
  return chain;
}

describe('inventory-report', () => {
  let mockSupabase: any;
  const warehouseId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn(),
    };
  });

  describe('generateInventorySummary', () => {
    it('should return summary with warehouse name and totals', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return createChainableMock({
            data: { name: 'Main Warehouse', code: 'WH01' },
          });
        }
        if (table === 'stocks') {
          const chain = createChainableMock({
            data: [
              {
                quantity: 10,
                products: { id: 'p1', sku: 'SKU1', name: 'Product 1', category_id: 'c1' },
                locations: { id: 'loc1', code: 'A-01', warehouse_id: warehouseId },
              },
              {
                quantity: 5,
                products: { id: 'p2', sku: 'SKU2', name: 'Product 2', category_id: 'c1' },
                locations: { id: 'loc2', code: 'A-02', warehouse_id: warehouseId },
              },
            ],
          });
          return chain;
        }
        if (table === 'locations') {
          return createCountMock(50);
        }
        if (table === 'product_categories') {
          return createChainableMock({
            data: [{ id: 'c1', name: 'Electronics' }],
          });
        }
        return createChainableMock({ data: null });
      });

      const result = await generateInventorySummary(mockSupabase as SupabaseClient, warehouseId);

      expect(result.warehouseName).toBe('Main Warehouse');
      expect(result.warehouseCode).toBe('WH01');
      expect(result.totalProducts).toBe(2);
      expect(result.totalLocations).toBe(50);
      expect(result.totalStockQuantity).toBe(15);
      expect(result.categoryBreakdown).toHaveLength(1);
      expect(result.categoryBreakdown[0].categoryName).toBe('Electronics');
      expect(result.generatedAt).toBeDefined();
    });

    it('should use Unknown/N/A when warehouse not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return createChainableMock({ data: null });
        }
        if (table === 'stocks') {
          return createChainableMock({ data: [] });
        }
        if (table === 'locations') {
          return createCountMock(0);
        }
        if (table === 'product_categories') {
          return createChainableMock({ data: [] });
        }
        return createChainableMock({ data: null });
      });

      const result = await generateInventorySummary(mockSupabase as SupabaseClient, warehouseId);

      expect(result.warehouseName).toBe('Unknown');
      expect(result.warehouseCode).toBe('N/A');
      expect(result.totalProducts).toBe(0);
      expect(result.totalLocations).toBe(0);
    });
  });

  describe('generateTransactionSummary', () => {
    it('should aggregate inbound, outbound and transfer counts', async () => {
      const start = new Date('2024-05-25T00:00:00Z');
      const end = new Date('2024-06-01T23:59:59Z');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return createChainableMock({ data: { name: 'WH', code: 'W1' } });
        }
        if (table === 'transactions') {
          return createChainableMock({
            data: [
              {
                type: 'INBOUND',
                quantity: 100,
                product_id: 'p1',
                products: { sku: 'SKU1', name: 'P1' },
              },
              {
                type: 'INBOUND',
                quantity: 50,
                product_id: 'p1',
                products: { sku: 'SKU1', name: 'P1' },
              },
              {
                type: 'OUTBOUND',
                quantity: 30,
                product_id: 'p1',
                products: { sku: 'SKU1', name: 'P1' },
              },
              {
                type: 'TRANSFER',
                quantity: 0,
                product_id: 'p2',
                products: { sku: 'SKU2', name: 'P2' },
              },
            ],
          });
        }
        return createChainableMock({ data: null });
      });

      const result = await generateTransactionSummary(
        mockSupabase as SupabaseClient,
        warehouseId,
        start,
        end,
      );

      expect(result.warehouseName).toBe('WH');
      expect(result.inboundCount).toBe(2);
      expect(result.inboundQuantity).toBe(150);
      expect(result.outboundCount).toBe(1);
      expect(result.outboundQuantity).toBe(30);
      expect(result.transferCount).toBe(1);
      expect(result.topProducts).toHaveLength(2);
      expect(result.period.start).toBe(start.toISOString());
      expect(result.period.end).toBe(end.toISOString());
    });

    it('should skip transactions with null product_id (no count, no topProducts entry)', async () => {
      const start = new Date('2024-05-25T00:00:00Z');
      const end = new Date('2024-06-01T23:59:59Z');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return createChainableMock({ data: { name: 'WH', code: 'W1' } });
        }
        if (table === 'transactions') {
          return createChainableMock({
            data: [
              {
                type: 'INBOUND',
                quantity: 10,
                product_id: null,
                products: null,
              },
              {
                type: 'OUTBOUND',
                quantity: 5,
                product_id: 'p1',
                products: { sku: 'SKU1', name: 'P1' },
              },
            ],
          });
        }
        return createChainableMock({ data: null });
      });

      const result = await generateTransactionSummary(
        mockSupabase as SupabaseClient,
        warehouseId,
        start,
        end,
      );

      // Rows with null product_id are skipped entirely (no inbound count for first row)
      expect(result.inboundCount).toBe(0);
      expect(result.inboundQuantity).toBe(0);
      expect(result.outboundCount).toBe(1);
      expect(result.outboundQuantity).toBe(5);
      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0].sku).toBe('SKU1');
    });
  });
});
