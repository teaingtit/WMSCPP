// types/inventory.ts

import { EntityStatus, EntityNote } from './status';

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
  image_url?: string;
  created_at?: string;
  is_active: boolean;
  attributes?: Record<string, any>;
  /** The name of the category, typically populated from a join operation. */
  category?: string;
  /** Status applied to this product */
  current_status?: EntityStatus;
  /** Notes attached to this product */
  notes?: EntityNote[];
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
  /** Status applied to this location */
  current_status?: EntityStatus;
  /** Notes attached to this location */
  notes?: EntityNote[];
}

/**
 * Product shape returned from stocks select with products!inner(...) join.
 * Used when typing Supabase join results in transfer/outbound actions.
 */
export interface StockProductJoin {
  id?: string;
  sku?: string;
  name: string;
  uom?: string;
}

/**
 * Location shape returned from stocks select with locations!inner(...) join.
 * Used when typing Supabase join results in transfer/outbound actions.
 */
export interface StockLocationJoin {
  id?: string;
  code: string;
  warehouse_id?: string;
}

/**
 * Stock row shape when selected with products and locations joins.
 * Supabase returns products/locations as single objects for !inner joins.
 */
export interface StockRowWithJoins {
  id?: string;
  quantity?: number;
  product_id?: string;
  location_id?: string;
  products: StockProductJoin;
  locations: StockLocationJoin;
}

/**
 * Raw stock row where products/locations may be single object or array (Supabase join result).
 * Use when normalizing query results into StockWithDetails.
 */
export type StockRowPrefill = Omit<StockRowWithJoins, 'products' | 'locations'> & {
  products: StockProductJoin | StockProductJoin[];
  locations: StockLocationJoin | StockLocationJoin[];
};

/**
 * Represents a stock item with its associated product and location details.
 * This is a composite type, typically generated from a database join.
 */
export interface StockWithDetails {
  id: string;
  quantity: number;
  updated_at: string;
  attributes?: Record<string, any>;
  product: Product; // Nested Object from Join
  location: Location; // Nested Object from Join
  // Flattened properties for UI compatibility
  lot?: string | null;
  cart?: string | null;
  level?: string | null;
  sku?: string;
  name?: string;
  image_url?: string;
  /** Status applied to this stock item */
  current_status?: EntityStatus;
  /** Notes attached to this stock item */
  notes?: EntityNote[];
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
  status: 'OPEN' | 'COMPLETED';
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

/**
 * Row shape from Supabase realtime postgres_changes payload for audit_items.
 * payload.new contains only table columns (no joined relations).
 */
export type AuditItemRealtimeRow = Pick<
  AuditItem,
  | 'id'
  | 'session_id'
  | 'product_id'
  | 'location_id'
  | 'status'
  | 'system_qty'
  | 'counted_qty'
  | 'diff_qty'
  | 'counter_id'
  | 'assignee_id'
  | 'updated_at'
>;
