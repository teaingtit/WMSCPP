// types/inventory.ts

/**
 * Represents a product entity in the system.
 * Corresponds to the 'products' table in the database.
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  uom: string;
  category_id: string;
  min_stock: number;
  image_url?: string;
  created_at?: string;
  is_active: boolean;
  attributes?: Record<string, any>;
  category?: string;
}

/**
 * Represents a storage location within a warehouse.
 * Corresponds to the 'locations' table in the database.
 */
export interface Location {
  id: string;
  code: string;
  warehouse_id: string;
  lot: string | null;
  cart: string | null; // Represents the cart or specific position within the location.
  level: string | null;
  is_active: boolean;
}

/**
 * Represents a stock item with its associated product and location details.
 * This is a composite type, typically generated from a database join.
 */
export interface StockWithDetails {
  id: string;
  quantity: number;
  updated_at: string;
  attributes?: Record<string, any>;
  products: Product;   // Nested Object จากการ Join
  locations: Location; // Nested Object จากการ Join
}

/**
 * Represents a flattened inventory item structure.
 * NOTE: This type seems to overlap with StockWithDetails.
 * Consider using this for specific use cases like form submissions or API payloads, or remove if redundant.
 */
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