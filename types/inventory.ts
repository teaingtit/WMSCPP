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
  /** The name of the category, typically populated from a join operation. */
  category?: string;
}

/**
 * Represents a storage location within a warehouse.
 * Corresponds to the 'locations' table in the database.
 * The combination of lot, cart, and level can define a more specific position.
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
  product: Product;   // Nested Object from Join
  location: Location; // Nested Object from Join
  // Flattened properties for UI compatibility
  lot?: string | null;
  cart?: string | null;
  level?: string | null;
  sku?: string;
  name?: string;
  image_url?: string;
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
export interface AuditSession {
  id: string;
  warehouse_id: string;
  name: string;
  status: 'OPEN' | 'FINALIZED' | 'CANCELLED';
  created_at: string;
  created_by: string;
  finalized_at?: string;
}

export interface AuditItem {
  id: string;
  session_id: string;
  product_id: string;
  location_id: string;
  status: 'PENDING' | 'COUNTED';
  system_qty: number;
  counted_qty: number | null;
  diff_qty: number | null;
  counter_id?: string;
  assignee_id?: string | null;
  updated_at: string;
  // Relations (สำหรับการ join แสดงผล)
  product?: Product;
  location?: Location;
  assignee?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}