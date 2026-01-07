'use server';

import { createClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';
import {
  HistoryMode,
  HistoryEntry,
  TransactionEntry,
  SystemLogEntry,
  HistoryFilter,
} from '@/types/history';

export { type HistoryMode };

export async function getHistory(
  warehouseId: string,
  limit = 100,
  mode: HistoryMode = 'simple',
  filter?: HistoryFilter,
): Promise<HistoryEntry[]> {
  noStore();
  const supabase = await createClient();

  // 1. Get Warehouse ID
  const { data: wh } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', warehouseId)
    .single();

  if (!wh) return [];

  // 1.5 Fetch Attribute Schemas for Label Resolution
  const { data: categories } = await supabase.from('product_categories').select('form_schema');

  const attributeLabelMap: Record<string, string> = {};
  if (categories) {
    categories.forEach((cat: any) => {
      if (Array.isArray(cat.form_schema)) {
        cat.form_schema.forEach((field: any) => {
          if (field.key && field.label) {
            attributeLabelMap[field.key] = field.label;
          }
        });
      }
    });
  }

  // 2. Fetch Transactions (Common for both modes)
  let txQuery = supabase
    .from('transactions')
    .select(
      `
      *,
      product:products(sku, name, uom),
      from_loc:locations!from_location_id(code, warehouse:warehouses(name)),
      to_loc:locations!to_location_id(code, warehouse:warehouses(name))
    `,
    )
    .eq('warehouse_id', wh.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply Filters to Transactions
  if (filter?.search) {
    // Note: Searching nested relations in Supabase/PostgREST is tricky with 'or'.
    // We'll search local fields and try to filter in memory for complex joins if needed,
    // or use !inner joins. For now, let's search searchable text fields.
    // A complex OR filter across joined tables often requires a custom RPC or carefully constructed query.
    // Simplified search: details, user_email.
    // For product name/sku, we might need !inner join or separate filtering.
    // Let's try a broad OR on the main table first.
    txQuery = txQuery.or(`details.ilike.%${filter.search}%,user_email.ilike.%${filter.search}%`);
  }

  if (filter?.type && filter.type !== 'ALL') {
    txQuery = txQuery.eq('type', filter.type);
  }

  if (filter?.startDate) {
    txQuery = txQuery.gte('created_at', filter.startDate);
  }
  if (filter?.endDate) {
    txQuery = txQuery.lte('created_at', filter.endDate);
  }

  if (mode === 'simple') {
    // If specific type selected, respect it, otherwise default simple types
    if (!filter?.type || filter.type === 'ALL') {
      txQuery = txQuery.in('type', ['INBOUND', 'OUTBOUND', 'TRANSFER', 'TRANSFER_OUT']);
    }
  }

  const { data: transactions, error: txError } = await txQuery;

  if (txError) {
    console.error('Fetch History Error:', txError);
    return [];
  }

  // Client-side filtering for joined fields (Product Name/SKU) if search term exists
  // This is a tradeoff: Fetch more, filter in memory vs complex query.
  // Given "limit", this operates on the result set.
  // To do it properly, we'd need to modify the query to use !inner(product) etc.
  let filteredTransactions = transactions || [];
  if (filter?.search) {
    const lowerSearch = filter.search.toLowerCase();
    filteredTransactions = filteredTransactions.filter((t: any) => {
      const matchMain =
        t.details?.toLowerCase().includes(lowerSearch) ||
        t.user_email?.toLowerCase().includes(lowerSearch);
      const matchProduct =
        t.product?.name?.toLowerCase().includes(lowerSearch) ||
        t.product?.sku?.toLowerCase().includes(lowerSearch);
      return matchMain || matchProduct;
    });
  }

  // Map Transactions to HistoryEntry
  const mappedTransactions: TransactionEntry[] = filteredTransactions.map((t: any) => {
    const formatLoc = (loc: any) => (loc ? `${loc.warehouse?.name || ''} (${loc.code})` : null);

    let from = formatLoc(t.from_loc) || t.details || '-';
    let to = formatLoc(t.to_loc) || t.details || '-';

    if (t.type === 'ADJUST') {
      from = 'System';
      to = 'Adjustment';
    }

    // Resolve Attributes
    const resolvedAttributes: Record<string, any> = {};
    if (t.attributes) {
      Object.entries(t.attributes).forEach(([key, value]) => {
        const label = attributeLabelMap[key] || key; // Use label if found, else original key
        resolvedAttributes[label] = value;
      });
    }

    return {
      id: t.id,
      category: 'TRANSACTION',
      type: t.type,
      product: t.product?.name || 'Unknown',
      sku: t.product?.sku || '-',
      quantity: t.quantity,
      uom: t.product?.uom || 'PCS',
      from,
      to,
      date: t.created_at,
      user: t.user_email || 'System',
      details: t.details,
      attributes: resolvedAttributes,
    };
  });

  // If Simple Mode, return transactions only
  if (mode === 'simple') {
    return mappedTransactions;
  }

  // 3. Fetch System Logs (Detailed Mode Only)

  // Get Location IDs
  const { data: locIds } = await supabase.from('locations').select('id').eq('warehouse_id', wh.id);
  const locationIds = locIds?.map((l) => l.id) || [];

  let logs: any[] = [];

  if (locationIds.length > 0) {
    let logQuery = supabase
      .from('status_change_logs')
      .select(
        `
        *,
        changer:profiles!changed_by(email, first_name, last_name),
        from_status:status_definitions!from_status_id(name),
        to_status:status_definitions!to_status_id(name)
      `,
      )
      .in('entity_id', locationIds) // Filter by warehouse locations
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (filter?.search) {
      logQuery = logQuery.or(`reason.ilike.%${filter.search}%`);
      // Note: can't easily search 'changer.email' via OR without RPC or embedding
    }

    if (filter?.type && filter.type !== 'ALL') {
      // If user filters for TRANSACTION types (INBOUND...), logs should be empty
      // If user filters for SYSTEM types (STATUS_CHANGE...), logs should show
      if (['INBOUND', 'OUTBOUND', 'TRANSFER', 'TRANSFER_OUT', 'ADJUST'].includes(filter.type)) {
        logQuery = logQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Return nothing
      }
    }

    if (filter?.startDate) {
      logQuery = logQuery.gte('changed_at', filter.startDate);
    }
    if (filter?.endDate) {
      logQuery = logQuery.lte('changed_at', filter.endDate);
    }

    const { data: statusLogs, error: logError } = await logQuery;

    if (!logError && statusLogs) {
      logs = statusLogs;

      // Manual filter for Changer Email if search is present
      if (filter?.search) {
        const lowerSearch = filter.search.toLowerCase();
        logs = logs.filter(
          (l: any) =>
            l.reason?.toLowerCase().includes(lowerSearch) ||
            l.changer?.email?.toLowerCase().includes(lowerSearch),
        );
      }
    }
  }

  // Map Logs
  const entityIds = logs.map((l) => l.entity_id);
  let entityNames: Record<string, string> = {};

  if (entityIds.length > 0) {
    const { data: locs } = await supabase.from('locations').select('id, code').in('id', entityIds);
    locs?.forEach((l) => (entityNames[l.id] = `Location ${l.code}`));
  }

  const mappedLogs: SystemLogEntry[] = logs.map((l: any) => ({
    id: l.id,
    category: 'SYSTEM',
    type: 'STATUS_CHANGE',
    date: l.changed_at,
    user: l.changer?.email || 'System',
    entityType: l.entity_type,
    entityName: entityNames[l.entity_id] || 'Unknown Entity',
    entityId: l.entity_id,
    action: 'Status Change',
    oldValue: l.from_status?.name || 'None',
    newValue: l.to_status?.name || 'None',
    reason: l.reason,
    details: l.reason, // Use reason as details
  }));

  // Combine and Sort
  const combined = [...mappedTransactions, ...mappedLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return combined.slice(0, limit);
}
