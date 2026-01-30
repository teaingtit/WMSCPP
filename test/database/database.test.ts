import { describe, it, expect } from 'vitest';
import { TABLES, RPC, ROLES } from '@/lib/constants';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Database unit tests: validate app constants (TABLES, RPC, ROLES) stay in sync
 * with database/schema.sql and database/functions.sql.
 */

const DATABASE_DIR = path.resolve(process.cwd(), 'database');

function extractTableNamesFromSchema(schemaContent: string): string[] {
  const names: string[] = [];
  const regex = /CREATE TABLE IF NOT EXISTS\s+([a-z_]+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(schemaContent)) !== null) {
    names.push(m[1].toLowerCase());
  }
  return [...new Set(names)].sort();
}

function extractPublicRpcNamesFromFunctions(fnContent: string): string[] {
  const names: string[] = [];
  // Match CREATE OR REPLACE FUNCTION name( or CREATE OR REPLACE FUNCTION public.name(
  const regex = /CREATE OR REPLACE FUNCTION\s+(?:public\.)?([a-z_]+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(fnContent)) !== null) {
    const name = m[1].toLowerCase();
    // Exclude DB-only helpers used in RLS/triggers (not called from app via RPC)
    if (
      name !== 'handle_new_user' &&
      name !== 'update_updated_at_column' &&
      name !== 'is_admin' &&
      name !== 'is_admin_or_manager'
    ) {
      names.push(name);
    }
  }
  return [...new Set(names)].sort();
}

describe('database contract', () => {
  describe('schema and functions files', () => {
    it('should have schema.sql and functions.sql in database dir', () => {
      expect(fs.existsSync(path.join(DATABASE_DIR, 'schema.sql'))).toBe(true);
      expect(fs.existsSync(path.join(DATABASE_DIR, 'functions.sql'))).toBe(true);
    });
  });

  describe('TABLES', () => {
    it('should have all table names from schema.sql', () => {
      const schemaPath = path.join(DATABASE_DIR, 'schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      const expectedTables = extractTableNamesFromSchema(content);

      const appTableValues = Object.values(TABLES) as string[];
      const appTables = [...new Set(appTableValues)].sort();

      expect(appTables).toEqual(expectedTables);
    });

    it('should have unique non-empty string values', () => {
      const values = Object.values(TABLES) as string[];
      expect(values.every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
      expect(new Set(values).size).toBe(values.length);
    });

    it('should match expected table name literals used in code', () => {
      expect(TABLES.USER_ROLES).toBe('user_roles');
      expect(TABLES.WAREHOUSES).toBe('warehouses');
      expect(TABLES.STOCKS).toBe('stocks');
      expect(TABLES.PROFILES).toBe('profiles');
      expect(TABLES.TRANSACTIONS).toBe('transactions');
    });
  });

  describe('RPC', () => {
    it('should have all public RPC names from functions.sql that the app calls', () => {
      const fnPath = path.join(DATABASE_DIR, 'functions.sql');
      const content = fs.readFileSync(fnPath, 'utf-8');
      const allDbRpcs = extractPublicRpcNamesFromFunctions(content);

      const appRpcValues = Object.values(RPC) as string[];
      const appRpcs = [...new Set(appRpcValues)].sort();

      // App should only reference RPCs that exist in the DB
      for (const rpc of appRpcs) {
        expect(allDbRpcs).toContain(rpc);
      }
      // App should reference all RPCs that are intended for app use (subset of DB)
      const expectedAppRpcs = [
        'process_inbound_transaction',
        'process_inbound_batch',
        'deduct_stock',
        'transfer_stock',
        'transfer_cross_stock',
        'create_warehouse_xyz_grid',
        'get_next_schema_version',
        'process_audit_adjustment',
      ].sort();
      expect(appRpcs).toEqual(expectedAppRpcs);
    });

    it('should have unique non-empty string values', () => {
      const values = Object.values(RPC) as string[];
      expect(values.every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('ROLES', () => {
    it('should have expected role values', () => {
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MANAGER).toBe('manager');
      expect(ROLES.STAFF).toBe('staff');
    });

    it('should match user_roles.role check constraint in schema', () => {
      const allowedRoles = [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF];
      expect(allowedRoles).toContain('admin');
      expect(allowedRoles).toContain('manager');
      expect(allowedRoles).toContain('staff');
      expect(allowedRoles).toHaveLength(3);
    });
  });
});
