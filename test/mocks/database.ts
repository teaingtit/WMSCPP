// @ts-nocheck
/**
 * Database Mocking Utilities for Testing
 *
 * This module provides comprehensive mocking for Supabase database operations,
 * including query builders, RPC calls, and authentication.
 */

import { vi } from 'vitest';

// ============================================
// TYPES
// ============================================

export interface MockQueryResult<T = any> {
  data: T | null;
  error: MockDatabaseError | null;
  count?: number;
}

export interface MockDatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface MockTableData {
  [key: string]: any[];
}

// ============================================
// MOCK DATABASE CLASS
// ============================================

/**
 * MockDatabase simulates an in-memory database for testing.
 * Use this when you need to test complex queries with realistic data.
 */
export class MockDatabase {
  private tables: MockTableData = {};

  constructor(initialData?: MockTableData) {
    if (initialData) {
      this.tables = { ...initialData };
    }
  }

  /** Seed a table with data */
  seed(tableName: string, data: any[]): void {
    this.tables[tableName] = [...data];
  }

  /** Get all records from a table */
  getAll(tableName: string): any[] {
    return this.tables[tableName] || [];
  }

  /** Find records matching a condition */
  find(tableName: string, predicate: (item: any) => boolean): any[] {
    return this.getAll(tableName).filter(predicate);
  }

  /** Find a single record */
  findOne(tableName: string, predicate: (item: any) => boolean): any | null {
    return this.find(tableName, predicate)[0] || null;
  }

  /** Insert a record */
  insert(tableName: string, record: any): any {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    const newRecord = { id: `mock-${Date.now()}`, ...record };
    this.tables[tableName].push(newRecord);
    return newRecord;
  }

  /** Update records matching a condition */
  update(tableName: string, predicate: (item: any) => boolean, updates: any): number {
    let count = 0;
    this.tables[tableName] = this.getAll(tableName).map((item) => {
      if (predicate(item)) {
        count++;
        return { ...item, ...updates };
      }
      return item;
    });
    return count;
  }

  /** Delete records matching a condition */
  delete(tableName: string, predicate: (item: any) => boolean): number {
    const original = this.getAll(tableName);
    this.tables[tableName] = original.filter((item) => !predicate(item));
    return original.length - this.tables[tableName].length;
  }

  /** Clear all data */
  reset(): void {
    this.tables = {};
  }

  /** Clear a specific table */
  clearTable(tableName: string): void {
    this.tables[tableName] = [];
  }
}

// ============================================
// QUERY BUILDER MOCK
// ============================================

/**
 * Creates a chainable query builder mock that mimics Supabase's query API.
 * Supports all common query methods and can be configured with expected results.
 *
 * NOTE: Supabase does NOT reject promises on errors - it returns { data: null, error: ... }
 * This mock follows that pattern for realistic testing.
 */
export function createMockQueryBuilder(result: MockQueryResult = { data: null, error: null }) {
  const builder: any = {};

  // Chainable methods
  const chainableMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'range',
    'textSearch',
    'match',
    'not',
    'or',
    'and',
    'filter',
    'order',
    'limit',
    'offset',
    'range',
    'abortSignal',
    'csv',
    'geojson',
    'explain',
    'rollback',
    'returns',
    'throwOnError',
  ];

  chainableMethods.forEach((method) => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  // Terminal methods
  builder.single = vi.fn().mockResolvedValue(result);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);

  // Make thenable for await support
  // Supabase always resolves (even with errors) - error is in the result object
  const promise = Promise.resolve(result);
  builder.then = promise.then.bind(promise);
  builder.catch = promise.catch.bind(promise);
  builder.finally = promise.finally?.bind(promise);

  return builder;
}

/**
 * Creates a query builder that can be configured per-call.
 * Useful when you need different responses for different queries.
 */
export function createConfigurableQueryBuilder() {
  const responses: Map<string, MockQueryResult> = new Map();
  let defaultResult: MockQueryResult = { data: null, error: null };
  let callHistory: { method: string; args: any[] }[] = [];

  const builder: any = {};

  const chainableMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'order',
    'limit',
    'offset',
    'not',
    'or',
    'filter',
  ];

  chainableMethods.forEach((method) => {
    builder[method] = vi.fn((...args: any[]) => {
      callHistory.push({ method, args });
      // Check if there's a specific response configured for this call pattern
      const key = `${method}:${JSON.stringify(args)}`;
      if (responses.has(key)) {
        const result = responses.get(key)!;
        // Supabase always resolves - errors are in the result object
        const promise = Promise.resolve(result);
        builder.then = promise.then.bind(promise);
        builder.catch = promise.catch.bind(promise);
      }
      return builder;
    });
  });

  builder.single = vi.fn().mockImplementation(() => {
    const lastEq = callHistory.filter((c) => c.method === 'eq').pop();
    if (lastEq) {
      const key = `single:${lastEq.args[0]}:${lastEq.args[1]}`;
      if (responses.has(key)) {
        return Promise.resolve(responses.get(key));
      }
    }
    return Promise.resolve(defaultResult);
  });

  builder.maybeSingle = vi.fn().mockImplementation(() => {
    return Promise.resolve(defaultResult);
  });

  // Configuration methods
  builder._setResponse = (key: string, result: MockQueryResult) => {
    responses.set(key, result);
    return builder;
  };

  builder._setDefault = (result: MockQueryResult) => {
    defaultResult = result;
    // Supabase always resolves - errors are in the result object
    const promise = Promise.resolve(result);
    builder.then = promise.then.bind(promise);
    builder.catch = promise.catch.bind(promise);
    return builder;
  };

  builder._getCallHistory = () => [...callHistory];
  builder._reset = () => {
    callHistory = [];
    responses.clear();
    return builder;
  };

  // Make thenable
  const promise = Promise.resolve(defaultResult);
  builder.then = promise.then.bind(promise);
  builder.catch = promise.catch.bind(promise);

  return builder;
}

// ============================================
// SUPABASE CLIENT MOCK
// ============================================

export interface MockSupabaseConfig {
  /** Default user to return from auth.getUser() */
  user?: any;
  /** Default query result for tables */
  defaultQueryResult?: MockQueryResult;
  /** Table-specific query builders */
  tables?: Record<string, ReturnType<typeof createMockQueryBuilder>>;
  /** RPC responses by function name */
  rpcResponses?: Record<string, MockQueryResult>;
}

/**
 * Creates a comprehensive mock Supabase client.
 * This is the main mock factory for tests.
 */
export function createMockSupabaseClient(config: MockSupabaseConfig = {}) {
  const {
    user = null,
    defaultQueryResult = { data: null, error: null },
    tables = {},
    rpcResponses = {},
  } = config;

  const mockFrom = vi.fn((tableName: string) => {
    if (tables[tableName]) {
      return tables[tableName];
    }
    return createMockQueryBuilder(defaultQueryResult);
  });

  const mockRpc = vi.fn((fnName: string, _params?: any) => {
    if (rpcResponses[fnName]) {
      const result = rpcResponses[fnName];
      return Promise.resolve(result);
    }
    return Promise.resolve({ data: null, error: null });
  });

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user, session: { access_token: 'mock-token' } },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user, session: null },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: user ? { access_token: 'mock-token', user } : null },
      error: null,
    }),
  };

  return {
    from: mockFrom,
    rpc: mockRpc,
    auth: mockAuth,
    // Expose for test configuration
    _mockFrom: mockFrom,
    _mockRpc: mockRpc,
    _mockAuth: mockAuth,
  };
}

// ============================================
// MOCK DATA FACTORIES
// ============================================

export const mockFactories = {
  /** Create a mock user */
  user: (overrides: Partial<any> = {}) => ({
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    banned_until: null,
    ...overrides,
  }),

  /** Create a mock user role */
  userRole: (overrides: Partial<any> = {}) => ({
    user_id: `user-${Date.now()}`,
    role: 'staff',
    is_active: true,
    allowed_warehouses: [],
    ...overrides,
  }),

  /** Create a mock warehouse */
  warehouse: (overrides: Partial<any> = {}) => ({
    id: `wh-${Date.now()}`,
    code: 'WH01',
    name: 'Test Warehouse',
    axis_x: 5,
    axis_y: 5,
    axis_z: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /** Create a mock product category */
  category: (overrides: Partial<any> = {}) => ({
    id: `CAT-${Date.now()}`,
    name: 'Test Category',
    form_schema: [],
    units: ['PCS'],
    schema_version: 1,
    ...overrides,
  }),

  /** Create a mock product */
  product: (overrides: Partial<any> = {}) => ({
    id: `prod-${Date.now()}`,
    sku: `SKU-${Date.now()}`,
    name: 'Test Product',
    category_id: 'CAT-001',
    uom: 'PCS',
    attributes: {},
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /** Create a mock stock record */
  stock: (overrides: Partial<any> = {}) => ({
    id: `stock-${Date.now()}`,
    warehouse_id: 'wh-001',
    location_id: 'loc-001',
    product_id: 'prod-001',
    lot: `LOT-${Date.now()}`,
    quantity: 100,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /** Create a mock location */
  location: (overrides: Partial<any> = {}) => ({
    id: `loc-${Date.now()}`,
    warehouse_id: 'wh-001',
    code: 'A-01-01',
    x: 1,
    y: 1,
    z: 1,
    is_active: true,
    ...overrides,
  }),

  /** Create a mock transaction */
  transaction: (overrides: Partial<any> = {}) => ({
    id: `txn-${Date.now()}`,
    type: 'INBOUND',
    warehouse_id: 'wh-001',
    product_id: 'prod-001',
    quantity: 10,
    lot: `LOT-${Date.now()}`,
    reference: `REF-${Date.now()}`,
    performed_by: 'user-001',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /** Create a mock audit session */
  auditSession: (overrides: Partial<any> = {}) => ({
    id: `audit-${Date.now()}`,
    warehouse_id: 'wh-001',
    status: 'PENDING',
    created_by: 'user-001',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /** Create a mock status definition */
  statusDefinition: (overrides: Partial<any> = {}) => ({
    id: `status-${Date.now()}`,
    name: 'Available',
    code: 'AVAILABLE',
    color: '#00FF00',
    bg_color: '#E8F5E9',
    text_color: '#2E7D32',
    effect: 'NONE',
    status_type: 'PRODUCT',
    is_default: false,
    is_active: true,
    sort_order: 0,
    ...overrides,
  }),
};

// ============================================
// ERROR FACTORIES
// ============================================

export const mockErrors = {
  /** Duplicate key error */
  duplicate: (field: string = 'id'): MockDatabaseError => ({
    message: `duplicate key value violates unique constraint`,
    code: '23505',
    details: `Key (${field}) already exists.`,
  }),

  /** Foreign key violation */
  foreignKey: (table: string = 'related_table'): MockDatabaseError => ({
    message: `insert or update on table violates foreign key constraint`,
    code: '23503',
    details: `Key is not present in table "${table}".`,
  }),

  /** Not found (single() returns no rows) */
  notFound: (): MockDatabaseError => ({
    message: 'JSON object requested, multiple (or no) rows returned',
    code: 'PGRST116',
  }),

  /** Permission denied */
  permissionDenied: (): MockDatabaseError => ({
    message: 'permission denied for table',
    code: '42501',
  }),

  /** Connection error */
  connection: (): MockDatabaseError => ({
    message: 'connection refused',
    code: 'ECONNREFUSED',
  }),

  /** Generic database error */
  generic: (message: string = 'Database error'): MockDatabaseError => ({
    message,
    code: 'ERROR',
  }),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates a successful query result
 */
export function successResult<T>(data: T, count?: number): MockQueryResult<T> {
  return { data, error: null, count };
}

/**
 * Creates an error query result
 */
export function errorResult(error: MockDatabaseError): MockQueryResult {
  return { data: null, error };
}

/**
 * Creates a query builder pre-configured for a specific table scenario
 */
export function createTableMock(scenario: {
  selectResult?: MockQueryResult;
  insertResult?: MockQueryResult;
  updateResult?: MockQueryResult;
  deleteResult?: MockQueryResult;
  singleResult?: MockQueryResult;
}) {
  const builder = createConfigurableQueryBuilder();

  if (scenario.selectResult) {
    builder._setDefault(scenario.selectResult);
  }
  if (scenario.singleResult) {
    builder.single.mockResolvedValue(scenario.singleResult);
    builder.maybeSingle.mockResolvedValue(scenario.singleResult);
  }

  return builder;
}
