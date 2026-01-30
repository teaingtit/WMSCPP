// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkEditSchemas, previewBulkEdit } from '@/actions/bulk-schema-actions';

// Use vi.hoisted to ensure mocks are initialized before usage in vi.mock
const { mockChain, mockCategories } = vi.hoisted(() => {
  const mockCategories = [
    {
      id: 'FOOD',
      name: 'อาหาร',
      form_schema: [{ key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' }],
    },
    {
      id: 'BEVERAGE',
      name: 'เครื่องดื่ม',
      form_schema: [{ key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' }],
    },
  ];

  const chain: any = {
    data: null,
    error: null,
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    update: vi.fn(),
    from: vi.fn(),
    then: function (resolve: any) {
      resolve({ data: this.data, error: this.error });
    },
  };

  chain.select.mockImplementation(() => chain);
  chain.eq.mockImplementation(() => chain);
  chain.in.mockImplementation((_col: string, ids: string[]) => {
    chain.data = mockCategories.filter((c) => ids.includes(c.id));
    return chain;
  });
  chain.update.mockImplementation(() => {
    chain.data = null;
    return chain;
  });
  chain.from.mockImplementation(() => chain);

  return { mockChain: chain, mockCategories };
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
  })),
}));

vi.mock('@/actions/schema-version-actions', () => ({
  createSchemaVersion: vi.fn(() => ({
    success: true,
    version: 2,
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Bulk Schema Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain.data = mockCategories;
    mockChain.error = null;
  });

  describe('previewBulkEdit', () => {
    it('should preview merge mode changes', async () => {
      const newFields = [
        { key: 'price', label: 'ราคา', type: 'number', required: true, scope: 'PRODUCT' },
      ];

      const result = await previewBulkEdit(['FOOD', 'BEVERAGE'], 'merge', newFields);

      expect(result.success).toBe(true);
      expect(result.preview).toHaveLength(2);
      expect(result.categoriesAffected).toBe(2);
      expect(result.preview[0].newFieldCount).toBe(2); // original + new field
    });

    it('should preview replace mode changes', async () => {
      const newFields = [
        { key: 'code', label: 'รหัส', type: 'text', required: true, scope: 'PRODUCT' },
      ];

      // Mock only one category returned
      mockChain.in.mockImplementationOnce(() => {
        mockChain.data = [mockCategories[0]];
        return mockChain;
      });

      const result = await previewBulkEdit(['FOOD'], 'replace', newFields);

      expect(result.success).toBe(true);
      expect(result.preview[0].newFieldCount).toBe(1);
      expect(result.preview[0].changed).toBe(true);
    });

    it('should preview remove mode changes', async () => {
      const fieldsToRemove = [
        { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
      ];

      mockChain.in.mockImplementationOnce(() => {
        mockChain.data = [mockCategories[0]];
        return mockChain;
      });

      const result = await previewBulkEdit(['FOOD'], 'remove', fieldsToRemove);

      expect(result.success).toBe(true);
      expect(result.success).toBe(true);
      expect(result.preview[0].newFieldCount).toBe(0);
    });

    it('should handle merge with existing field', async () => {
      const existingField = [
        { key: 'name', label: 'ชื่อใหม่', type: 'text', required: true, scope: 'PRODUCT' },
      ];
      const result = await previewBulkEdit(['FOOD'], 'merge', existingField);
      expect(result.success).toBe(true);
      expect(result.preview[0].newSchema.find((f) => f.key === 'name')?.label).toBe('ชื่อใหม่');
    });

    it('should return error on database failure', async () => {
      mockChain.in.mockImplementationOnce(() => {
        mockChain.error = { message: 'Database failure' };
        return mockChain;
      });
      const result = await previewBulkEdit(['FOOD'], 'merge', []);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Database failure');
    });
  });

  describe('bulkEditSchemas', () => {
    it('should apply merge mode to multiple categories', async () => {
      const newFields = [
        { key: 'price', label: 'ราคา', type: 'number', required: true, scope: 'PRODUCT' },
      ];

      const result = await bulkEditSchemas(
        ['FOOD', 'BEVERAGE'],
        'merge',
        newFields,
        'Added price field',
      );

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
      expect(result.message).toContain('Successfully updated 2 categories');
    });

    it('should apply replace mode', async () => {
      const newFields = [
        { key: 'code', label: 'รหัส', type: 'text', required: true, scope: 'PRODUCT' },
      ];

      mockChain.in.mockImplementationOnce(() => {
        mockChain.data = [mockCategories[0]];
        return mockChain;
      });

      const result = await bulkEditSchemas(['FOOD'], 'replace', newFields);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
    });

    it('should skip categories with no changes', async () => {
      const sameFields = [
        { key: 'name', label: 'ชื่อ', type: 'text', required: true, scope: 'PRODUCT' },
      ];

      mockChain.in.mockImplementationOnce(() => {
        mockChain.data = [mockCategories[0]];
        return mockChain;
      });

      const result = await bulkEditSchemas(['FOOD'], 'replace', sameFields);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should return error when no categories selected', async () => {
      const result = await bulkEditSchemas([], 'replace', []);
      expect(result.success).toBe(false);
      expect(result.message).toBe('No categories selected');
    });

    it('should handle partial failures during update', async () => {
      const { createSchemaVersion } = await import('@/actions/schema-version-actions');
      // Forcing success to false globally for this test
      vi.mocked(createSchemaVersion).mockResolvedValue({
        success: false,
        message: 'Version error',
      });

      const result = await bulkEditSchemas(['FOOD'], 'replace', []);
      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);

      // Reset mock
      vi.mocked(createSchemaVersion).mockResolvedValue({ success: true, version: 2 });
    });

    it('should handle database errors during update', async () => {
      mockChain.update.mockResolvedValueOnce({ error: { message: 'Update failed' } });
      const result = await bulkEditSchemas(['FOOD'], 'replace', []);
      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
    });

    it('should return system error on unexpected exception', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockImplementationOnce(() => {
        throw new Error('System crash');
      });
      const result = await bulkEditSchemas(['FOOD'], 'replace', []);
      expect(result.success).toBe(false);
      expect(result.message).toBe('System crash');
    });
  });
});
