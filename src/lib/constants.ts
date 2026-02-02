// lib/constants.ts
import { Package, Settings, LayoutGrid, ClipboardCheck, History } from 'lucide-react';

export const APP_CONFIG = {
  name: 'WMS DEMO',
  version: '1.0.0',
  description: 'Warehouse Management System',
};

// รวมเมนูไว้ที่เดียว
export const MENU_ITEMS = [
  {
    title: 'เลือกคลังสินค้า',
    href: '/dashboard',
    icon: LayoutGrid, // ส่งเป็น Component ไม่ใช่ JSX
    matchPath: '/dashboard', // ใช้เช็ค Active Menu
    exact: true,
  },
  {
    title: 'สินค้าคงคลัง (Inventory)',
    href: '/dashboard/[warehouseId]/inventory', // ตัวอย่าง URL Pattern
    icon: Package,
    matchPath: '/inventory',
    hidden: true, // ซ่อนจากเมนูหลัก (อาจจะใช้ใน Submenu)
  },
  {
    title: 'ตรวจนับสต็อก (Audit)',
    href: '/dashboard/[warehouseId]/audit', // ใช้ Pattern เดียวกับ DesktopSidebar
    matchPath: '/audit',
    icon: ClipboardCheck,
  },
  {
    title: 'ประวัติ (History)',
    href: '/dashboard/[warehouseId]/history',
    icon: History,
    matchPath: '/history',
  },
  {
    title: 'ตั้งค่าระบบ',
    href: '/dashboard/settings',
    icon: Settings,
    matchPath: '/settings',
  },
];

// รวมสีสถานะไว้ที่เดียว
export const STATUS_COLORS = {
  active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  inactive: 'bg-rose-50 text-rose-600 border-rose-100',
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
};

export const CATEGORY_COLORS: Record<string, string> = {
  CHEMICAL: 'bg-amber-50 text-amber-700 border-amber-100',
  GENERAL: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  FROZEN: 'bg-cyan-50 text-cyan-700 border-cyan-100',
};

// --- System Constants ---

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;

/** Single source of truth for public table names. Use these instead of string literals. */
export const TABLES = {
  USER_ROLES: 'user_roles',
  PROFILES: 'profiles',
  WAREHOUSES: 'warehouses',
  LOCATIONS: 'locations',
  PRODUCT_CATEGORIES: 'product_categories',
  CATEGORY_SCHEMA_VERSIONS: 'category_schema_versions',
  PRODUCTS: 'products',
  STOCKS: 'stocks',
  TRANSACTIONS: 'transactions',
  AUDIT_SESSIONS: 'audit_sessions',
  AUDIT_ITEMS: 'audit_items',
  STATUS_DEFINITIONS: 'status_definitions',
  ENTITY_STATUSES: 'entity_statuses',
  LOT_STATUSES: 'lot_statuses',
  STATUS_CHANGE_LOGS: 'status_change_logs',
  PARTIAL_STATUS_REMOVALS: 'partial_status_removals',
  ENTITY_NOTES: 'entity_notes',
} as const;

/** RPC function names (Supabase). Use with supabase.rpc(RPC.XYZ, { ... }). */
export const RPC = {
  PROCESS_INBOUND_TRANSACTION: 'process_inbound_transaction',
  PROCESS_INBOUND_BATCH: 'process_inbound_batch',
  DEDUCT_STOCK: 'deduct_stock',
  TRANSFER_STOCK: 'transfer_stock',
  TRANSFER_CROSS_STOCK: 'transfer_cross_stock',
  CREATE_WAREHOUSE_XYZ_GRID: 'create_warehouse_xyz_grid',
  GET_NEXT_SCHEMA_VERSION: 'get_next_schema_version',
  PROCESS_AUDIT_ADJUSTMENT: 'process_audit_adjustment',
  GET_INVENTORY_BY_POSITIONS: 'get_inventory_by_positions',
} as const;

export const AUDIT_STATUS = {
  PENDING: 'PENDING',
  COUNTED: 'COUNTED',
  REVIEWED: 'REVIEWED',
  COMPLETED: 'COMPLETED',
} as const;
