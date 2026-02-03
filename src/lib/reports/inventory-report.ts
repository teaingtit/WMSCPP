/**
 * Inventory Report Generation Utilities
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface InventorySummaryData {
  warehouseName: string;
  warehouseCode: string;
  totalProducts: number;
  totalLocations: number;
  totalStockQuantity: number;
  categoryBreakdown: Array<{
    categoryName: string;
    productCount: number;
    totalQuantity: number;
  }>;
  generatedAt: string;
}

export interface TransactionSummaryData {
  warehouseName: string;
  warehouseCode: string;
  period: { start: string; end: string };
  inboundCount: number;
  inboundQuantity: number;
  outboundCount: number;
  outboundQuantity: number;
  transferCount: number;
  topProducts: Array<{
    sku: string;
    name: string;
    inbound: number;
    outbound: number;
    net: number;
  }>;
  generatedAt: string;
}

/**
 * Generate inventory summary report data
 */
export async function generateInventorySummary(
  supabase: SupabaseClient,
  warehouseId: string,
): Promise<InventorySummaryData> {
  // Get warehouse info
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('name, code')
    .eq('id', warehouseId)
    .single();

  // Get stock summary
  const { data: stocks } = await supabase
    .from('stocks')
    .select(
      `
      quantity,
      products!inner(id, sku, name, category_id),
      locations!inner(id, code, warehouse_id)
    `,
    )
    .eq('locations.warehouse_id', warehouseId);

  // Get locations count
  const { count: locationCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', warehouseId);

  // Get categories for breakdown
  const { data: categories } = await supabase.from('product_categories').select('id, name');

  const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) || []);

  // Calculate totals
  const totalQuantity = stocks?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
  const productIds = new Set(stocks?.map((s) => (s.products as any).id) || []);

  // Category breakdown
  const categoryTotals = new Map<string, { count: Set<string>; quantity: number }>();
  (stocks || []).forEach((s) => {
    const catId = (s.products as any).category_id;
    if (!categoryTotals.has(catId)) {
      categoryTotals.set(catId, { count: new Set(), quantity: 0 });
    }
    const cat = categoryTotals.get(catId)!;
    cat.count.add((s.products as any).id);
    cat.quantity += s.quantity || 0;
  });

  const categoryBreakdown = Array.from(categoryTotals.entries()).map(([catId, data]) => ({
    categoryName: categoryMap.get(catId) || 'Unknown',
    productCount: data.count.size,
    totalQuantity: data.quantity,
  }));

  return {
    warehouseName: warehouse?.name || 'Unknown',
    warehouseCode: warehouse?.code || 'N/A',
    totalProducts: productIds.size,
    totalLocations: locationCount || 0,
    totalStockQuantity: totalQuantity,
    categoryBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate transaction summary report data
 */
export async function generateTransactionSummary(
  supabase: SupabaseClient,
  warehouseId: string,
  startDate: Date,
  endDate: Date,
): Promise<TransactionSummaryData> {
  // Get warehouse info
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('name, code')
    .eq('id', warehouseId)
    .single();

  // Get transactions in date range
  const { data: transactions } = await supabase
    .from('transactions')
    .select(
      `
      type,
      quantity,
      product_id,
      products(sku, name)
    `,
    )
    .eq('warehouse_id', warehouseId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  // Calculate totals
  let inboundCount = 0;
  let inboundQuantity = 0;
  let outboundCount = 0;
  let outboundQuantity = 0;
  let transferCount = 0;

  const productTotals = new Map<
    string,
    { sku: string; name: string; inbound: number; outbound: number }
  >();

  (transactions || []).forEach((tx) => {
    const qty = tx.quantity || 0;
    const productId = tx.product_id;
    if (productId == null) return; // skip transactions without product (e.g. audit)
    const product = tx.products as any;

    if (!productTotals.has(productId)) {
      productTotals.set(productId, {
        sku: product?.sku || 'N/A',
        name: product?.name || 'Unknown',
        inbound: 0,
        outbound: 0,
      });
    }
    const pt = productTotals.get(productId)!;

    switch (tx.type) {
      case 'INBOUND':
        inboundCount++;
        inboundQuantity += qty;
        pt.inbound += qty;
        break;
      case 'OUTBOUND':
        outboundCount++;
        outboundQuantity += qty;
        pt.outbound += qty;
        break;
      case 'TRANSFER':
      case 'TRANSFER_OUT':
        transferCount++;
        break;
    }
  });

  // Top products by activity
  const topProducts = Array.from(productTotals.values())
    .map((p) => ({ ...p, net: p.inbound - p.outbound }))
    .sort((a, b) => b.inbound + b.outbound - (a.inbound + a.outbound))
    .slice(0, 10);

  return {
    warehouseName: warehouse?.name || 'Unknown',
    warehouseCode: warehouse?.code || 'N/A',
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    inboundCount,
    inboundQuantity,
    outboundCount,
    outboundQuantity,
    transferCount,
    topProducts,
    generatedAt: new Date().toISOString(),
  };
}
