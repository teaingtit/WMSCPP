// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSchemaHistory,
  createSchemaVersion,
  revertToVersion,
  compareSchemaVersions,
} from '@/actions/schema-version-actions';

// Use vi.hoisted to ensure mocks are initialized before usage in vi.mock
const { mockChain, mockSchemaVersions } = vi.hoisted(() => {
  const mockSchemaVersions = [
    {
      id: 'v1-id',
      category_id: 'FOOD',
      version: 1,
      schema: [
        { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
        { key: 'price', label: 'ราคา', type: 'number', required: true, scope: 'PRODUCT' },
      ],
      created_at: '2024-01-10T10:00:00Z',
      created_by: 'user-1',
      change_notes: 'Initial schema',
    },
    {
      id: 'v2-id',
      category_id: 'FOOD',
      version: 2,
      schema: [
        { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
        { key: 'price', label: 'ราคา', type: 'number', required: true, scope: 'PRODUCT' },
        { key: 'expiry', label: 'วันหมดอายุ', type: 'date', required: false, scope: 'LOT' },
      ],
      created_at: '2024-01-15T10:00:00Z',
      created_by: 'user-1',
      change_notes: 'Added expiry date field',
    },
    {
      id: 'v3-id',
      category_id: 'FOOD',
      version: 3,
      schema: [
        { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
        { key: 'price', label: 'ราคา', type: 'number', required: true, scope: 'PRODUCT' },
      ],
      created_at: '2024-01-20T10:00:00Z',
      created_by: 'user-1',
      change_notes: 'Removed expiry',
    },
  ];

  const chain: any = {
    data: null,
    error: null,
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    then: function (resolve: any) {
      resolve({ data: this.data, error: this.error });
    },
  };

  chain.select.mockImplementation(() => {
    chain.data = mockSchemaVersions;
    return chain;
  });
  chain.eq.mockImplementation(() => chain);
  chain.in.mockImplementation((col: string, values: any[]) => {
    // Filter based on version if .in('version', [...]) is called
    if (col === 'version' && Array.isArray(values)) {
      chain.data = mockSchemaVersions.filter((v) => values.includes(v.version));
    } else {
      chain.data = mockSchemaVersions;
    }
    return chain;
  });
  chain.order.mockImplementation((col: string, { ascending }: any = { ascending: true }) => {
    if (chain.data && Array.isArray(chain.data)) {
      chain.data = [...chain.data].sort((a: any, b: any) => {
        const valA = a[col] || 0;
        const valB = b[col] || 0;
        return ascending ? valA - valB : valB - valA;
      });
    }
    return chain;
  });
  chain.single.mockImplementation(() => {
    chain.data = mockSchemaVersions[0];
    return chain;
  });
  chain.insert.mockImplementation(() => chain);
  chain.update.mockImplementation(() => chain);

  return { mockChain: chain, mockSchemaVersions };
});

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
      })),
    },
    from: vi.fn((table: string) => mockChain),
    rpc: vi.fn(() => ({
      data: 3,
      error: null,
    })),
  })),
}));

describe('Schema Version Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain.data = null;
    mockChain.error = null;
  });

  describe('getSchemaHistory', () => {
    it('should retrieve schema history for a category', async () => {
      const result = await getSchemaHistory('FOOD');

      expect(result.success).toBe(true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].version).toBe(3);
      expect(result.data[1].version).toBe(2);
    });

    it('should return empty array for category with no history', async () => {
      mockChain.order.mockImplementationOnce(() => {
        mockChain.data = [];
        return mockChain;
      });

      const result = await getSchemaHistory('NONEXISTENT');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(0);
    });
  });

  describe('createSchemaVersion', () => {
    it('should create a new schema version', async () => {
      const newSchema = [
        { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
        { key: 'weight', label: 'น้ำหนัก', type: 'number', required: false, scope: 'PRODUCT' },
      ];

      const result = await createSchemaVersion('FOOD', newSchema, 'Added weight field');

      expect(result.success).toBe(true);
      expect(result.version).toBe(3);
    });

    it('should auto-increment version number', async () => {
      const newSchema = [
        { key: 'test', label: 'Test', type: 'text', required: false, scope: 'PRODUCT' },
      ];

      const result = await createSchemaVersion('FOOD', newSchema);

      expect(result.success).toBe(true);
      expect(result.version).toBe(3);
    });

    it('should return error when inserting fails', async () => {
      mockChain.insert.mockImplementationOnce(() => {
        mockChain.error = new Error('Insert failed');
        return mockChain;
      });

      const result = await createSchemaVersion('FOOD', []);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Insert failed');
    });
  });

  describe('revertToVersion error handling', () => {
    it('should return unauthenticated when user is null', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        from: vi.fn(() => mockChain),
        rpc: vi.fn(),
      } as any);

      const result = await revertToVersion('FOOD', 1);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthenticated');
    });
  });

  describe('revertToVersion', () => {
    it('should revert to a previous version by creating a new version', async () => {
      mockChain.single.mockImplementationOnce(() => {
        mockChain.data = mockSchemaVersions[1];
        return mockChain;
      });

      const result = await revertToVersion('FOOD', 1);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Reverted to version 1/i);
    });

    it('should fail if target version does not exist', async () => {
      mockChain.single.mockImplementationOnce(() => {
        mockChain.data = null;
        return mockChain;
      });

      const result = await revertToVersion('FOOD', 999);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('compareSchemaVersions', () => {
    it('should compare two schema versions and return differences', async () => {
      // When compareSchemaVersions calls .in(), mocked .in sets data to mockSchemaVersions

      const result = await compareSchemaVersions('FOOD', 1, 2);

      expect(result.success).toBe(true);
      expect(result.diff).toBeDefined();
      expect(result.diff.added).toHaveLength(1); // expiry field added
      expect(result.diff.removed).toHaveLength(0);
      expect(result.diff.added[0].key).toBe('expiry');
    });

    it('should detect removed fields', async () => {
      const result = await compareSchemaVersions('FOOD', 2, 3);

      expect(result.success).toBe(true);
      expect(result.diff.removed).toHaveLength(1);
      expect(result.diff.removed[0].key).toBe('expiry');
    });

    it('should return error when one or both versions not found', async () => {
      mockChain.in.mockImplementationOnce(() => {
        mockChain.data = [mockSchemaVersions[0]];
        return mockChain;
      });

      const result = await compareSchemaVersions('FOOD', 1, 99);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return error on database exception', async () => {
      mockChain.in.mockImplementationOnce(() => {
        throw new Error('Query error');
      });

      const result = await compareSchemaVersions('FOOD', 1, 2);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Query error');
    });
  });

  describe('getSchemaHistory', () => {
    it('should return error and empty data on DB error', async () => {
      const prevError = mockChain.error;
      const prevData = mockChain.data;
      mockChain.error = new Error('DB error');
      mockChain.data = null;
      mockChain.then = function (resolve: any) {
        resolve({ data: this.data, error: this.error });
        return { catch: vi.fn() };
      };

      const result = await getSchemaHistory('FOOD');

      expect(result.success).toBe(false);
      expect(result.message).toBe('DB error');
      expect(result.data).toEqual([]);
      mockChain.error = prevError;
      mockChain.data = prevData;
    });
  });

  describe('createSchemaVersion', () => {
    it('should return unauthenticated when user is null', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        from: vi.fn(() => mockChain),
        rpc: vi.fn(),
      } as any);

      const result = await createSchemaVersion('FOOD', [{ key: 'x', label: 'X', type: 'text' }]);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthenticated');
    });
  });

  describe('getProductsBySchemaVersion', () => {
    it('should return products for schema version', async () => {
      const { getProductsBySchemaVersion } = await import('@/actions/schema-version-actions');
      const mockProducts = [
        { id: 'p1', sku: 'SKU1', name: 'Product 1', schema_version_created: 1 },
      ];
      const productChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: any) => {
          resolve({ data: mockProducts, error: null });
          return { catch: vi.fn() };
        }),
      };
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockImplementationOnce(() =>
        Promise.resolve({
          auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
          from: vi.fn((_table: string) => productChain),
          rpc: vi.fn(),
        } as any),
      );

      const result = await getProductsBySchemaVersion('FOOD', 1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProducts);
      expect(result.count).toBe(1);
    });

    it('should return error and empty data on failure', async () => {
      const { getProductsBySchemaVersion } = await import('@/actions/schema-version-actions');
      const prevError = mockChain.error;
      const prevData = mockChain.data;
      mockChain.error = new Error('DB error');
      mockChain.data = null;
      mockChain.then = function (resolve: any) {
        resolve({ data: this.data, error: this.error });
        return { catch: vi.fn() };
      };

      const result = await getProductsBySchemaVersion('FOOD', 1);

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
      mockChain.error = prevError;
      mockChain.data = prevData;
    });
  });
});
