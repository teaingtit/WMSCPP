import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStockById,
  searchStockForTransfer,
  submitTransfer,
  submitCrossTransfer,
  submitBulkTransfer,
  preflightBulkTransfer,
} from '@/actions/transfer-actions';
import { createMockSupabaseClient, createMockUser } from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/lib/utils/db-helpers', () => ({
  getWarehouseId: vi.fn((supabase, id) => Promise.resolve(id)),
}));

vi.mock('@/lib/action-utils', () => ({
  withAuth: vi.fn((handler) => handler),
}));

describe('Transfer Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getStockById', () => {
    it('should fetch stock by ID', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
        locations: { code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getStockById('stock1');

      expect(result).toEqual(mockStock);
    });
  });

  describe('searchStockForTransfer', () => {
    it('should search stocks for transfer', async () => {
      const mockStocks = [
        {
          id: 'stock1',
          quantity: 10,
          products: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          locations: { code: 'L01-P01-1', warehouse_id: 'wh1' },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockStocks, error: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await searchStockForTransfer('wh1', 'Product');

      expect(result).toEqual(mockStocks);
    });
  });

  describe('submitTransfer', () => {
    it('should successfully transfer stock internally', async () => {
      const mockUser = createMockUser();
      const mockSourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };

      const mockSourceQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSourceStock }),
      };

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      // Create target location query builder
      const createTargetQuery = () => {
        const query: any = {};
        query.select = vi.fn(function() { return query; });
        query.eq = vi.fn(function() { return query; });
        query.single = vi.fn().mockResolvedValue({ data: { code: 'L01-P02-1' } });
        return query;
      };
      const mockTargetQuery = createTargetQuery();

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'transactions') {
          return mockInsertQuery;
        }
        if (table === 'stocks') {
          callCount++;
          if (callCount === 1) return mockSourceQuery;
          return mockSourceQuery;
        }
        if (table === 'entity_statuses') {
          return mockStatusQuery;
        }
        if (table === 'locations') {
          return mockTargetQuery; // For location code lookup
        }
        return mockSourceQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        targetLocationId: 'loc2',
        transferQty: 5,
      };

      const result = await submitTransfer(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('transfer_stock', expect.any(Object));
      expect(result.success).toBe(true);
    });

    it('should reject transfer to same location', async () => {
      const mockUser = createMockUser();
      const mockSourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };

      // Create query builder that supports chaining
      const createSourceQuery = () => {
        const query: any = {};
        query.select = vi.fn(function() { return query; });
        query.eq = vi.fn(function() { return query; });
        query.single = vi.fn().mockResolvedValue({ data: mockSourceStock });
        return query;
      };
      const mockSourceQuery = createSourceQuery();

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'stocks') {
          callCount++;
          if (callCount === 1) return mockSourceQuery;
          return mockSourceQuery;
        }
        if (table === 'entity_statuses') {
          return mockStatusQuery;
        }
        return mockSourceQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        targetLocationId: 'loc1', // Same as source location_id
        transferQty: 5,
      };

      const result = await submitTransfer(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ตำแหน่งเดิม');
    });

    it('should reject transfer for restricted status', async () => {
      const mockUser = createMockUser();
      const mockSourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };

      const mockStatus = {
        status_definitions: {
          name: 'Blocked',
          effect: 'TRANSACTIONS_PROHIBITED',
        },
      };

      // Create query builder that supports chaining
      const createSourceQuery = () => {
        const query: any = {};
        query.select = vi.fn(function() { return query; });
        query.eq = vi.fn(function() { return query; });
        query.single = vi.fn().mockResolvedValue({ data: mockSourceStock });
        return query;
      };
      const mockSourceQuery = createSourceQuery();

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockStatus }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'stocks') {
          callCount++;
          if (callCount === 1) return mockSourceQuery;
          return mockSourceQuery;
        }
        if (table === 'entity_statuses') {
          return mockStatusQuery;
        }
        return mockSourceQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        targetLocationId: 'loc2',
        transferQty: 5,
      };

      const result = await submitTransfer(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่สามารถย้าย');
    });
  });

  describe('submitCrossTransfer', () => {
    it('should reject cross-transfer to same warehouse', async () => {
      const mockUser = createMockUser();
      const formData = {
        sourceWarehouseId: 'wh1',
        targetWarehouseId: 'wh1', // Same warehouse
        stockId: 'stock1',
        transferQty: 5,
      };

      const result = await submitCrossTransfer(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('แตกต่างจากคลังต้นทาง');
    });
  });

  describe('preflightBulkTransfer', () => {
    it('should validate bulk transfer items', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const items = [
        {
          sourceStock: { id: 'stock1' },
          qty: 5,
          targetLocation: { id: 'loc2' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });
});
