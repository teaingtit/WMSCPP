import { SupabaseClient } from '@supabase/supabase-js';
import { isValidUUID } from '@/lib/utils';

/** Resolves a warehouse identifier (code or UUID) to a UUID. */
export async function getWarehouseId(
  supabase: SupabaseClient,
  warehouseIdentifier: string,
): Promise<string | null> {
  if (isValidUUID(warehouseIdentifier)) return warehouseIdentifier;
  const { data } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', warehouseIdentifier)
    .maybeSingle();
  return data?.id ?? null;
}
