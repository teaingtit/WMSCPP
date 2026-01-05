import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves a warehouse identifier (code or UUID) to a UUID.
 * Checks if the input is a valid UUID, if not, queries the database by code.
 */
export async function getWarehouseId(
  supabase: SupabaseClient,
  warehouseIdentifier: string,
): Promise<string | null> {
  // Check if it's already a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    warehouseIdentifier,
  );
  if (isUUID) return warehouseIdentifier;

  const { data } = await supabase
    .from('warehouses')
    .select('id')
    .eq('code', warehouseIdentifier)
    .maybeSingle();

  return data?.id ?? null;
}
