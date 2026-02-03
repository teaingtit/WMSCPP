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
import { getWarehouseId } from '@/lib/utils/db-helpers';
import type { FormSchemaField } from '@/types/settings';
import { sanitizeSearchQuery, isValidSearchQuery } from '@/lib/search-utils';

export { type HistoryMode };

// RPC function name for full-text search
const SEARCH_TRANSACTIONS_RPC = 'search_transactions';

export async function getHistory(
  warehouseId: string,
  limit = 100,
  mode: HistoryMode = 'simple',
  filter?: HistoryFilter,
): Promise<HistoryEntry[]> {
  noStore();
  const supabase = await createClient();

  // 1. Get Warehouse ID (handles both UUID and code)
  const whId = await getWarehouseId(supabase, warehouseId);

  if (!whId) return [];

  // 1.5 Fetch Attribute Schemas for Label Resolution
  const { data: categories } = await supabase.from('product_categories').select('form_schema');

  const attributeLabelMap: Record<string, string> = {};
  if (categories) {
    categories.forEach((cat: { form_schema?: (FormSchemaField & { label?: string })[] }) => {
      if (Array.isArray(cat.form_schema)) {
        cat.form_schema.forEach((field) => {
          if (field.key && field.label) {
            attributeLabelMap[field.key] = field.label;
          }
        });
      }
    });
  }

  // 2. Fetch Transactions - Use full-text search RPC when search query is provided
  let transactions: any[] = [];
  let txError: any = null;

  // Use full-text search RPC for search queries >= 2 characters
  const useFullTextSearch = filter?.search && isValidSearchQuery(filter.search);

  if (useFullTextSearch) {
    // Use optimized full-text search
    const sanitizedQuery = sanitizeSearchQuery(filter!.search!);

    const { data: rpcData, error: rpcError } = await supabase.rpc(SEARCH_TRANSACTIONS_RPC, {
      p_warehouse_id: whId,
      p_query: sanitizedQuery,
      p_type: filter?.type && filter.type !== 'ALL' ? filter.type : null,
      p_start_date: filter?.startDate || null,
      p_end_date: filter?.endDate || null,
      p_limit: limit,
    });

    if (rpcError) {
      console.error('Full-text search error:', rpcError);
      // Fallback to regular query
      txError = rpcError;
    } else {
      // RPC returns raw transaction data, we need to fetch related data
      const txIds = (rpcData || []).map((t: any) => t.id);

      if (txIds.length > 0) {
        const { data: fullData, error: fullError } = await supabase
          .from('transactions')
          .select(
            `
            *,
            product:products(sku, name, uom),
            from_loc:locations!transactions_from_location_fkey(code, warehouse:warehouses(name)),
            to_loc:locations!transactions_to_location_fkey(code, warehouse:warehouses(name))
          `,
          )
          .in('id', txIds)
          .order('created_at', { ascending: false });

        transactions = fullData || [];
        txError = fullError;
      }
    }
  }

  // Fallback to regular query if not using full-text search or if it failed
  if (!useFullTextSearch || txError) {
    let txQuery = supabase
      .from('transactions')
      .select(
        `
        *,
        product:products(sku, name, uom),
        from_loc:locations!transactions_from_location_fkey(code, warehouse:warehouses(name)),
        to_loc:locations!transactions_to_location_fkey(code, warehouse:warehouses(name))
      `,
      )
      .eq('warehouse_id', whId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply Filters to Transactions
    if (filter?.search && !useFullTextSearch) {
      // Fallback to ILIKE for short queries
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

    const { data: queryData, error: queryError } = await txQuery;
    transactions = queryData || [];
    txError = queryError;
  }

  if (txError) {
    console.error('Fetch History Error:', txError);
    return [];
  }

  // Client-side filtering for joined fields (Product Name/SKU) if search term exists
  // This is still useful for filtering by product name/SKU which isn't in the search_vector
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
  const { data: locIds } = await supabase.from('locations').select('id').eq('warehouse_id', whId);
  const locationIds = locIds?.map((l) => l.id) || [];

  let logs: any[] = [];

  if (locationIds.length > 0) {
    let logQuery = supabase
      .from('status_change_logs')
      .select(
        `
        *,
        changer:profiles!changed_by(id, email, first_name, last_name, full_name),
        from_status:status_definitions!from_status_id(name),
        to_status:status_definitions!to_status_id(name)
      `,
      )
      .in('entity_id', locationIds) // Filter by warehouse locations
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (filter?.search) {
      logQuery = logQuery.or(`reason.ilike.%${filter.search}%`);
      // Note: search on changer email/name is applied in JS filter below
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

      // Manual filter for Changer email/name if search is present
      if (filter?.search) {
        const lowerSearch = filter.search.toLowerCase();
        const changerMatch = (l: any) => {
          const email = l.changer?.email?.toLowerCase() ?? '';
          const fn = l.changer?.first_name?.toLowerCase() ?? '';
          const ln = l.changer?.last_name?.toLowerCase() ?? '';
          const full = l.changer?.full_name?.toLowerCase() ?? '';
          return (
            email.includes(lowerSearch) ||
            fn.includes(lowerSearch) ||
            ln.includes(lowerSearch) ||
            full.includes(lowerSearch)
          );
        };
        logs = logs.filter(
          (l: any) => l.reason?.toLowerCase().includes(lowerSearch) || changerMatch(l),
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
    user:
      l.changer?.email ||
      l.changer?.full_name?.trim() ||
      [l.changer?.first_name, l.changer?.last_name].filter(Boolean).join(' ') ||
      'System',
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
