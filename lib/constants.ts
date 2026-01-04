// lib/constants.ts
import { Package, Settings, LayoutGrid, ClipboardCheck, History, BarChart3 } from 'lucide-react';

export const APP_CONFIG = {
  name: 'WMS Pro',
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
    exact: true
  },
  {
    title: 'สต็อกสินค้า (Inventory)',
    href: '/dashboard/[warehouseId]/inventory', // ตัวอย่าง URL Pattern
    icon: Package,
    matchPath: '/inventory',
    hidden: true // ซ่อนจากเมนูหลัก (อาจจะใช้ใน Submenu)
  },
  {
    title: 'Stock Audit',
    href: '/dashboard/[warehouseId]/audit', // ใช้ Pattern เดียวกับ DesktopSidebar
    matchPath: '/audit',
    icon: ClipboardCheck, 
  },
  {
    title: 'ประวัติ (History)',
    href: '/dashboard/[warehouseId]/history',
    icon: History,
    matchPath: '/history'
  },
  {
    title: 'ตั้งค่าระบบ',
    href: '/dashboard/settings',
    icon: Settings,
    matchPath: '/settings'
  }
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

export const TABLES = {
  USER_ROLES: 'user_roles',
  WAREHOUSES: 'warehouses',
  PRODUCTS: 'products',
  PRODUCT_CATEGORIES: 'product_categories',
  STOCKS: 'stocks',
  LOCATIONS: 'locations',
  TRANSACTIONS: 'transactions',
  AUDIT_SESSIONS: 'audit_sessions',
  AUDIT_ITEMS: 'audit_items',
} as const;

export const AUDIT_STATUS = {
  PENDING: 'PENDING',
  COUNTED: 'COUNTED',
  REVIEWED: 'REVIEWED',
  COMPLETED: 'COMPLETED',
} as const;