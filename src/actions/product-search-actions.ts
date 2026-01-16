'use server';

import { createClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  uom: string;
  category_id: string;
}

/**
 * Search products by name or SKU
 * @param query - Search term
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of matching products
 */
export async function searchProducts(
  query: string,
  limit = 10,
): Promise<{ success: boolean; data?: ProductSearchResult[]; error?: string }> {
  noStore();

  if (!query || query.trim().length === 0) {
    return { success: true, data: [] };
  }

  try {
    const supabase = await createClient();

    // Sanitize query to prevent PostgREST syntax errors
    const sanitizedQuery = query.replace(/,/g, '').trim();

    if (!sanitizedQuery) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, uom, category_id')
      .or(`name.ilike.%${sanitizedQuery}%,sku.ilike.%${sanitizedQuery}%`)
      .limit(limit);

    if (error) {
      console.error('Product search error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Unexpected error in searchProducts:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
