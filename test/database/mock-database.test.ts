/**
 * Unit tests for test/mocks/database.ts — target ≥80% coverage.
 * Covers MockDatabase, query builders, Supabase client mock, factories, errors, and helpers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MockDatabase,
  createMockQueryBuilder,
  createConfigurableQueryBuilder,
  createMockSupabaseClient,
  mockFactories,
  mockErrors,
  successResult,
  errorResult,
  createTableMock,
  type MockQueryResult,
  type MockDatabaseError,
} from '../mocks/database';

describe('mock database (coverage)', () => {
  describe('MockDatabase', () => {
    let db: MockDatabase;

    beforeEach(() => {
      db = new MockDatabase();
    });

    it('should return empty array from getAll for missing table', () => {
      expect(db.getAll('missing')).toEqual([]);
    });

    it('should return empty array from find when no matches', () => {
      db.seed('products', [mockFactories.product({ sku: 'A' })]);
      expect(db.find('products', (p) => p.sku === 'B')).toEqual([]);
    });

    it('should return null from findOne when no match', () => {
      db.seed('products', [mockFactories.product({ sku: 'A' })]);
      expect(db.findOne('products', (p) => p.sku === 'B')).toBeNull();
    });

    it('should return first match from findOne', () => {
      db.seed('products', [
        mockFactories.product({ sku: 'A' }),
        mockFactories.product({ sku: 'B' }),
      ]);
      const one = db.findOne('products', (p) => p.sku === 'B');
      expect(one?.sku).toBe('B');
    });

    it('should insert into existing table', () => {
      db.seed('products', [mockFactories.product({ sku: 'A' })]);
      const inserted = db.insert('products', { sku: 'B', name: 'Product B' });
      expect(inserted.id).toBeDefined();
      expect(inserted.sku).toBe('B');
      expect(db.getAll('products')).toHaveLength(2);
    });

    it('should update zero records and return 0', () => {
      db.seed('products', [mockFactories.product({ sku: 'A' })]);
      const count = db.update('products', (p) => p.sku === 'B', { name: 'X' });
      expect(count).toBe(0);
    });

    it('should update one record and return 1', () => {
      db.seed('products', [mockFactories.product({ sku: 'A', name: 'Old' })]);
      const count = db.update('products', (p) => p.sku === 'A', { name: 'New' });
      expect(count).toBe(1);
      expect(db.findOne('products', (p) => p.sku === 'A')?.name).toBe('New');
    });

    it('should update multiple records and return count', () => {
      db.seed('products', [
        mockFactories.product({ sku: 'A' }),
        mockFactories.product({ sku: 'A' }),
        mockFactories.product({ sku: 'B' }),
      ]);
      const count = db.update('products', (p) => p.sku === 'A', { name: 'Updated' });
      expect(count).toBe(2);
    });

    it('should delete zero records and return 0', () => {
      db.seed('products', [mockFactories.product({ sku: 'A' })]);
      const count = db.delete('products', (p) => p.sku === 'B');
      expect(count).toBe(0);
    });

    it('should delete one record and return 1', () => {
      db.seed('products', [mockFactories.product({ sku: 'A' })]);
      const count = db.delete('products', (p) => p.sku === 'A');
      expect(count).toBe(1);
      expect(db.getAll('products')).toHaveLength(0);
    });

    it('should delete multiple records and return count', () => {
      db.seed('products', [
        mockFactories.product({ sku: 'A' }),
        mockFactories.product({ sku: 'A' }),
      ]);
      const count = db.delete('products', (p) => p.sku === 'A');
      expect(count).toBe(2);
      expect(db.getAll('products')).toHaveLength(0);
    });

    it('should reset all tables', () => {
      db.seed('products', [mockFactories.product()]);
      db.seed('warehouses', [mockFactories.warehouse()]);
      db.reset();
      expect(db.getAll('products')).toHaveLength(0);
      expect(db.getAll('warehouses')).toHaveLength(0);
    });

    it('should clearTable only target table', () => {
      db.seed('products', [mockFactories.product(), mockFactories.product()]);
      db.seed('warehouses', [mockFactories.warehouse()]);
      db.clearTable('products');
      expect(db.getAll('products')).toHaveLength(0);
      expect(db.getAll('warehouses')).toHaveLength(1);
    });
  });

  describe('createMockQueryBuilder', () => {
    it('should resolve via .then with result', async () => {
      const result = { data: [1, 2], error: null };
      const builder = createMockQueryBuilder(result);
      const resolved = await builder.select('*');
      expect(resolved).toEqual(result);
    });

    it('should support .catch (promise resolves so catch receives result)', async () => {
      const builder = createMockQueryBuilder({ data: null, error: mockErrors.generic() });
      const result = await builder.catch(() => ({ data: null, error: null }));
      expect(result.error?.code).toBe('ERROR');
    });

    it('should support .finally', async () => {
      const builder = createMockQueryBuilder({ data: 1, error: null });
      let fin = false;
      await builder.finally(() => {
        fin = true;
      });
      expect(fin).toBe(true);
    });

    it('should resolve maybeSingle with result', async () => {
      const result = { data: { id: 1 }, error: null };
      const builder = createMockQueryBuilder(result);
      const out = await builder.maybeSingle();
      expect(out).toEqual(result);
    });
  });

  describe('createConfigurableQueryBuilder', () => {
    it('should record call history for chainable methods', () => {
      const builder = createConfigurableQueryBuilder();
      builder.select('*').eq('id', 1).limit(10);
      const history = builder._getCallHistory();
      expect(history.some((c) => c.method === 'select' && c.args[0] === '*')).toBe(true);
      expect(history.some((c) => c.method === 'eq' && c.args[0] === 'id' && c.args[1] === 1)).toBe(
        true,
      );
    });

    it('should return configured response for single() when key matches', async () => {
      const builder = createConfigurableQueryBuilder();
      const custom = { data: { id: 1, name: 'Custom' }, error: null };
      builder._setResponse('single:id:1', custom);
      builder.eq('id', 1);
      const result = await builder.single();
      expect(result).toEqual(custom);
    });

    it('should return default for single() when no response key', async () => {
      const builder = createConfigurableQueryBuilder();
      builder._setDefault({ data: null, error: mockErrors.notFound() });
      builder.eq('other', 99);
      const result = await builder.single();
      expect(result.error?.code).toBe('PGRST116');
    });

    it('should return default for maybeSingle()', async () => {
      const builder = createConfigurableQueryBuilder();
      builder._setDefault({ data: { x: 1 }, error: null });
      const result = await builder.maybeSingle();
      expect(result.data).toEqual({ x: 1 });
    });

    it('should _reset clear call history and responses', () => {
      const builder = createConfigurableQueryBuilder();
      builder.select('*')._setResponse('select:*', { data: 1, error: null })._reset();
      expect(builder._getCallHistory()).toHaveLength(0);
    });

    it('should return configured response for chainable method when key matches', async () => {
      const builder = createConfigurableQueryBuilder();
      const custom = { data: [99], error: null };
      builder._setResponse('select:["*"]', custom);
      const result = await builder.select('*');
      expect(result).toEqual(custom);
    });
  });

  describe('createMockSupabaseClient', () => {
    it('should use default query builder when table not in config', async () => {
      const client = createMockSupabaseClient({
        defaultQueryResult: { data: [], error: null },
      });
      const result = await client.from('unknown_table').select('*');
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should return default rpc result when fn not in rpcResponses', async () => {
      const client = createMockSupabaseClient();
      const result = await client.rpc('unknown_rpc', {});
      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should auth.getSession return null session when user is null', async () => {
      const client = createMockSupabaseClient({ user: null });
      const { data } = await client.auth.getSession();
      expect(data.session).toBeNull();
    });

    it('should auth.signUp resolve', async () => {
      const client = createMockSupabaseClient();
      const { data } = await client.auth.signUp({ email: 'a@b.com', password: 'x' });
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();
    });

    it('should auth.signOut resolve', async () => {
      const client = createMockSupabaseClient();
      const { error } = await client.auth.signOut();
      expect(error).toBeNull();
    });

    it('should auth.resetPasswordForEmail resolve', async () => {
      const client = createMockSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail('a@b.com');
      expect(error).toBeNull();
    });

    it('should auth.updateUser resolve', async () => {
      const client = createMockSupabaseClient();
      const { data } = await client.auth.updateUser({});
      expect(data.user).toBeNull();
    });
  });

  describe('mockFactories', () => {
    it('category factory and overrides', () => {
      const c = mockFactories.category({ name: 'Electronics', units: ['EA', 'BOX'] });
      expect(c.name).toBe('Electronics');
      expect(c.units).toEqual(['EA', 'BOX']);
    });

    it('stock factory and overrides', () => {
      const s = mockFactories.stock({ lot: 'LOT-X', quantity: 50 });
      expect(s.lot).toBe('LOT-X');
      expect(s.quantity).toBe(50);
    });

    it('location factory and overrides', () => {
      const loc = mockFactories.location({ code: 'B-02-03', x: 2, y: 2, z: 2 });
      expect(loc.code).toBe('B-02-03');
      expect(loc.x).toBe(2);
    });

    it('transaction factory and overrides', () => {
      const t = mockFactories.transaction({ type: 'OUTBOUND', quantity: 5 });
      expect(t.type).toBe('OUTBOUND');
      expect(t.quantity).toBe(5);
    });

    it('auditSession factory and overrides', () => {
      const a = mockFactories.auditSession({ status: 'COMPLETED' });
      expect(a.status).toBe('COMPLETED');
    });

    it('statusDefinition factory and overrides', () => {
      const d = mockFactories.statusDefinition({ code: 'SOLD', effect: 'HIDE' });
      expect(d.code).toBe('SOLD');
      expect(d.effect).toBe('HIDE');
    });

    it('userRole factory default and overrides', () => {
      const r = mockFactories.userRole({ role: 'admin', allowed_warehouses: ['wh-1'] });
      expect(r.role).toBe('admin');
      expect(r.allowed_warehouses).toEqual(['wh-1']);
    });
  });

  describe('mockErrors', () => {
    it('foreignKey with table name', () => {
      const e = mockErrors.foreignKey('products');
      expect(e.code).toBe('23503');
      expect(e.details).toContain('products');
    });

    it('connection error', () => {
      const e = mockErrors.connection();
      expect(e.code).toBe('ECONNREFUSED');
      expect(e.message).toContain('refused');
    });

    it('generic with custom message', () => {
      const e = mockErrors.generic('Custom DB error');
      expect(e.message).toBe('Custom DB error');
      expect(e.code).toBe('ERROR');
    });

    it('generic default message', () => {
      const e = mockErrors.generic();
      expect(e.message).toBe('Database error');
    });
  });

  describe('successResult and errorResult', () => {
    it('successResult with count', () => {
      const r = successResult([1, 2, 3], 3);
      expect(r.data).toEqual([1, 2, 3]);
      expect(r.error).toBeNull();
      expect(r.count).toBe(3);
    });

    it('successResult without count', () => {
      const r = successResult({ id: 1 });
      expect(r.data).toEqual({ id: 1 });
      expect(r.count).toBeUndefined();
    });

    it('errorResult', () => {
      const err: MockDatabaseError = { message: 'Failed', code: 'X' };
      const r = errorResult(err);
      expect(r.data).toBeNull();
      expect(r.error).toEqual(err);
    });
  });

  describe('createTableMock', () => {
    it('should apply selectResult via _setDefault', async () => {
      const selectRes: MockQueryResult = { data: [{ id: 1 }], error: null };
      const builder = createTableMock({ selectResult: selectRes });
      const out = await builder.select('*');
      expect(out.data).toEqual([{ id: 1 }]);
    });

    it('should apply singleResult to single and maybeSingle', async () => {
      const singleRes: MockQueryResult = { data: { id: 1, name: 'One' }, error: null };
      const builder = createTableMock({ singleResult: singleRes });
      const out = await builder.select('*').eq('id', 1).single();
      expect(out.data).toEqual({ id: 1, name: 'One' });
    });
  });
});
