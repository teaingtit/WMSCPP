// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  APP_CONFIG,
  MENU_ITEMS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  ROLES,
  TABLES,
  RPC,
  AUDIT_STATUS,
} from '@/lib/constants';

describe('constants', () => {
  describe('APP_CONFIG', () => {
    it('should have name, version, and description', () => {
      expect(APP_CONFIG.name).toBe('WMS DEMO');
      expect(APP_CONFIG.version).toBe('1.0.0');
      expect(APP_CONFIG.description).toBe('Warehouse Management System');
    });
  });

  describe('MENU_ITEMS', () => {
    it('should have menu items with title, href, and icon', () => {
      expect(MENU_ITEMS.length).toBeGreaterThan(0);
      MENU_ITEMS.forEach((item) => {
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('href');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('matchPath');
      });
    });

    it('should include inventory and audit menu items', () => {
      const titles = MENU_ITEMS.map((m) => m.title);
      expect(titles).toContain('สินค้าคงคลัง (Inventory)');
      expect(titles).toContain('ตรวจนับสต็อก (Audit)');
    });
  });

  describe('STATUS_COLORS', () => {
    it('should have active, inactive, pending colors', () => {
      expect(STATUS_COLORS.active).toContain('emerald');
      expect(STATUS_COLORS.inactive).toContain('rose');
      expect(STATUS_COLORS.pending).toContain('amber');
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('should have CHEMICAL, GENERAL, FROZEN category colors', () => {
      expect(CATEGORY_COLORS.CHEMICAL).toBeDefined();
      expect(CATEGORY_COLORS.GENERAL).toBeDefined();
      expect(CATEGORY_COLORS.FROZEN).toBeDefined();
    });
  });

  describe('ROLES', () => {
    it('should have admin, manager, staff roles', () => {
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MANAGER).toBe('manager');
      expect(ROLES.STAFF).toBe('staff');
    });
  });

  describe('TABLES', () => {
    it('should have core table names', () => {
      expect(TABLES.WAREHOUSES).toBe('warehouses');
      expect(TABLES.PRODUCTS).toBe('products');
      expect(TABLES.STOCKS).toBe('stocks');
      expect(TABLES.TRANSACTIONS).toBe('transactions');
      expect(TABLES.AUDIT_SESSIONS).toBe('audit_sessions');
    });
  });

  describe('RPC', () => {
    it('should have RPC function names for Supabase', () => {
      expect(RPC.PROCESS_INBOUND_TRANSACTION).toBe('process_inbound_transaction');
      expect(RPC.DEDUCT_STOCK).toBe('deduct_stock');
      expect(RPC.TRANSFER_STOCK).toBe('transfer_stock');
      expect(RPC.PROCESS_AUDIT_ADJUSTMENT).toBe('process_audit_adjustment');
    });
  });

  describe('AUDIT_STATUS', () => {
    it('should have PENDING, COUNTED, REVIEWED, COMPLETED', () => {
      expect(AUDIT_STATUS.PENDING).toBe('PENDING');
      expect(AUDIT_STATUS.COUNTED).toBe('COUNTED');
      expect(AUDIT_STATUS.REVIEWED).toBe('REVIEWED');
      expect(AUDIT_STATUS.COMPLETED).toBe('COMPLETED');
    });
  });
});
