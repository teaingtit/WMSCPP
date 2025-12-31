// types/inventory.ts

// 1. Base Entities (ตรงตาม Database Snake Case)
export interface Product {
  id: string;
  sku: string;
  name: string;
  uom: string;
  category_id: string;
  min_stock: number;
  image_url?: string;
  created_at?: string;
}

export interface Location {
  id: string;
  code: string;
  warehouse_id: string;
  lot: string | null;
  cart: string | null; // หรือใช้ position ตามความเข้าใจ
  level: string | null;
  is_active: boolean;
}

// 2. ✅ FIX: Export Interface นี้เพื่อให้ Component เรียกใช้ได้
export interface StockWithDetails {
  id: string;
  quantity: number;
  updated_at: string;
  attributes?: Record<string, any>;
  products: Product;   // Nested Object จากการ Join
  locations: Location; // Nested Object จากการ Join
}

// 3. Other Utility Types
export interface InventoryItem {
  id: string;
  item_name: string;
  code: string;
  quantity: number;
  warehouse_id: string;
  location_id: string;
  cart_no?: string;
  lot?: string;
  uom: string;
  attributes?: Record<string, any>;
  remark?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HistoryLogItem {
  id: number;
  timestamp: string;
  action: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUST';
  details: string;
  status: 'SUCCESS' | 'ERROR';
  user_email?: string;
  quantity: number;
}