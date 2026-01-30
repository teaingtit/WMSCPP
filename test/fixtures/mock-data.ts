// @ts-nocheck
/**
 * Shared mock data for unit tests.
 * Use in action tests, db-helpers, and components.
 */

export const MOCK_PRODUCTS = [
  {
    id: 'prod-001',
    sku: 'SKU-001',
    name: 'Product Alpha',
    uom: 'EA',
    category_id: 'cat-001',
  },
  {
    id: 'prod-002',
    sku: 'SKU-002',
    name: 'Product Beta',
    uom: 'BOX',
    category_id: 'cat-001',
  },
  {
    id: 'prod-003',
    sku: 'SKU-003',
    name: 'Product Gamma',
    uom: 'EA',
    category_id: 'cat-002',
  },
] as const;

export const MOCK_WAREHOUSES = [
  { id: 'wh-uuid-001', code: 'WH-A', name: 'Warehouse A' },
  { id: 'wh-uuid-002', code: 'WH-B', name: 'Warehouse B' },
] as const;

export const MOCK_CATEGORIES = [
  { id: 'cat-001', name: 'Category One' },
  { id: 'cat-002', name: 'Category Two' },
] as const;

export const MOCK_STOCK_ROWS = [
  {
    product_id: 'prod-001',
    warehouse_id: 'wh-uuid-001',
    quantity: 100,
    lot: 'LOT-1',
    cart: 'A',
    level: 1,
  },
  {
    product_id: 'prod-002',
    warehouse_id: 'wh-uuid-001',
    quantity: 50,
    lot: 'LOT-2',
    cart: 'B',
    level: 1,
  },
] as const;
