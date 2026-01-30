// @ts-nocheck
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Re-export from the new mocks module for advanced usage
export {
  MockDatabase,
  createMockQueryBuilder,
  createConfigurableQueryBuilder,
  mockFactories,
  mockErrors,
  successResult,
  errorResult,
  createTableMock,
} from '../mocks/database';

/**
 * Creates a mock Supabase client for testing.
 *
 * For more advanced mocking with table-specific responses and RPC mocks,
 * use the createMockSupabaseClient from '../mocks/database' with config options.
 *
 * @example Basic usage
 * ```ts
 * const mockSupabase = createMockSupabaseClient();
 * ```
 *
 * @example With custom query builder
 * ```ts
 * const mockSupabase = createMockSupabaseClient();
 * const customQuery = {
 *   select: vi.fn().mockReturnThis(),
 *   eq: vi.fn().mockResolvedValue({ data: [...], error: null })
 * };
 * mockSupabase.from = vi.fn(() => customQuery);
 * ```
 */
export function createMockSupabaseClient(): Partial<SupabaseClient> {
  // Create a chainable query builder that supports multiple method calls
  const createQueryBuilder = (defaultResult: any = { data: null, error: null }) => {
    const builder: any = {};

    // Chainable methods that return the builder itself (allowing infinite chaining)
    const chainableMethods = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'neq',
      'in',
      'gt',
      'gte',
      'lt',
      'lte',
      'or',
      'not',
      'order',
      'limit',
      'offset',
      'range',
      'filter',
      'match',
      'like',
      'ilike',
      'is',
      'contains',
    ];
    chainableMethods.forEach((method) => {
      builder[method] = vi.fn(function (..._args: any[]) {
        return builder; // Always return builder for chaining
      });
    });

    // Terminal methods that return promises
    builder.single = vi.fn().mockResolvedValue(defaultResult);
    builder.maybeSingle = vi.fn().mockResolvedValue(defaultResult);

    // Make it thenable (Promise-like) - this allows the query to be awaited
    const promise = defaultResult.error
      ? Promise.reject(defaultResult.error)
      : Promise.resolve(defaultResult);

    builder.then = promise.then.bind(promise);
    builder.catch = promise.catch.bind(promise);
    builder.finally = promise.finally?.bind(promise);

    return builder;
  };

  const mockFrom = vi.fn(() => createQueryBuilder());

  return {
    from: mockFrom as any,
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
    } as any,
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.png' } })),
      })),
    } as any,
  } as any;
}

/**
 * Creates a mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock FormData object. Values can be string or File (for file uploads).
 */
export function createMockFormData(data: Record<string, string | File | Blob>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

/**
 * Mock Next.js navigation functions
 */
export function mockNextNavigation() {
  const pushMock = vi.fn();
  const redirectMock = vi.fn();

  vi.mock('next/navigation', () => ({
    redirect: redirectMock,
    revalidatePath: vi.fn(),
  }));

  return { pushMock, redirectMock };
}
