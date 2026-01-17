import { SupabaseClient } from '@supabase/supabase-js';

export async function getWarehouseId(
  supabase: SupabaseClient,
  codeOrId: string,
): Promise<string | null> {
  // valid uuid
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);

  if (isUuid) {
    return codeOrId;
  }

  // Try finding by code
  const { data } = await supabase.from('warehouses').select('id').eq('code', codeOrId).single();

  return data?.id || null;
}
