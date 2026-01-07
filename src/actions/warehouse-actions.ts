// actions/warehouse-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('warehouses')
    .select('*')
    .eq('is_active', true)
    .order('code', { ascending: true });
  return (data as Warehouse[]) || [];
}
