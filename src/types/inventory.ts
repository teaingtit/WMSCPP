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
 * Represents a storage location within a warehouse using hierarchical 3-level structure.
 * Corresponds to the 'locations' table in the database.
 *
 * Hierarchy: Zone (depth 0) → Aisle (depth 1) → Bin (depth 2)
 */
export interface Location {
  id: string;
  code: string; // Unique identifier (e.g., "A1-L1", "ZONE-A", "COLD-A2")
  warehouse_id: string;
  parent_id?: string | null;
  path: string; // Materialized path: "/A/A1/A1-L1/"
  depth: number; // 0=Zone, 1=Aisle, 2=Bin

  // Fixed 3-level hierarchy
  zone?: string; // Zone code (only for depth 0,1,2)
  aisle?: string; // Aisle code (only for depth 1,2)
  bin_code?: string; // Bin code (only for depth 2)

  attributes: Record<string, any>; // Custom metadata, lot-specific data
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;

  // Relations (from joins)
  parent?: Location;
  children?: Location[];
  /** Status applied to this location */
  current_status?: EntityStatus;
  /** Notes attached to this location */
  notes?: EntityNote[];
}

/**
 * Helper type for UI display with human-readable path
 */
export interface LocationDisplay {
  id: string;
  code: string;
  fullPath: string; // Human-readable: "Zone A > Aisle 1 > Bin L1"
  depth: number;
  zone?: string | undefined;
  aisle?: string | undefined;
  bin_code?: string | undefined;
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
