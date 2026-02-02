'use server';

import { createClient } from '@/lib/supabase/server';
import { RPC } from '@/lib/constants';

const POSITIONS_PER_PAGE = 15;

export interface InventoryByPositionsResult {
  stocks: unknown[];
  totalPositions: number;
  totalStocks: number;
  totalPages: number;
}

export interface GetInventoryByPositionsParams {
  warehouseId: string;
  page?: number;
  positionsPerPage?: number;
  search?: string;
}

/**
 * Fetches inventory stocks grouped by (lot, cart) position.
 * Ensures no position is split across pages.
 * Requires the get_inventory_by_positions RPC (run database/inventory-position-pagination.sql).
 */
export async function getInventoryByPositions({
  warehouseId,
  page = 1,
  positionsPerPage = POSITIONS_PER_PAGE,
  search,
}: GetInventoryByPositionsParams): Promise<InventoryByPositionsResult | null> {
  const supabase = await createClient();
  const currentPage = Math.max(1, page);
  const perPage = Math.max(1, Math.min(50, positionsPerPage));

  const { data, error } = await supabase.rpc(RPC.GET_INVENTORY_BY_POSITIONS, {
    p_warehouse_id: warehouseId,
    p_page: currentPage,
    p_positions_per_page: perPage,
    p_search: search && search.trim() ? search.trim() : null,
  });

  if (error) {
    console.error('getInventoryByPositions RPC error:', error);
    return null;
  }

  const result = data as {
    stocks?: unknown[];
    totalPositions?: number;
    totalStocks?: number;
  } | null;

  if (!result || !Array.isArray(result.stocks)) {
    return {
      stocks: [],
      totalPositions: 0,
      totalStocks: 0,
      totalPages: 0,
    };
  }

  const totalPositions = result.totalPositions ?? 0;
  const totalPages = totalPositions > 0 ? Math.ceil(totalPositions / perPage) : 0;

  return {
    stocks: result.stocks,
    totalPositions,
    totalStocks: result.totalStocks ?? result.stocks.length,
    totalPages,
  };
}
