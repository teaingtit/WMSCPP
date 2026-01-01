// actions/warehouse-actions.ts
'use server';

import { createClient } from '@/lib/db/supabase-server';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export async function getWarehouses() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching warehouses:', error);
      return [];
    }

    return data as Warehouse[];
  } catch (error) {
    console.error('Server Action Error:', error);
    return [];
  }
}