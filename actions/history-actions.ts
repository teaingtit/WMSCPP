// actions/history-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';

// 1. Define Type สำหรับ Transaction Log เพื่อให้ Frontend ใช้งานง่าย
export interface TransactionLog {
  id: string;
  type: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUST';
  quantity: number;
  created_at: string;
  note: string | null;
  ref_doc_no: string | null;
  attributes_snapshot: any; // หรือระบุละเอียดเช่น { lot?: string, expiry?: string }
  products: {
    name: string;
    sku: string;
    uom: string;
  } | null;
  from_location: { code: string } | null;
  to_location: { code: string } | null;
  user_id?: string; // ถ้ามีระบบ User
}

export async function getTransactionLogs(warehouseCode: string): Promise<TransactionLog[]> {
 const supabase = await createClient();

  try {
    // 1. หา ID คลัง (ใช้ maybeSingle เพื่อความปลอดภัย)
    const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('code', warehouseCode)
        .maybeSingle();
        
    if (!wh) return [];

    // 2. ดึง Logs
    // หมายเหตุ: การใช้ !transactions_from_location_id_fkey ต้องมั่นใจว่าชื่อ Foreign Key ใน DB ตรงกันเป๊ะๆ
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, type, quantity, created_at, note, ref_doc_no, 
        attributes_snapshot,  
        products (name, sku, uom),
        from_location:locations!transactions_from_location_id_fkey (code),
        to_location:locations!transactions_to_location_id_fkey (code)
      `)
      .eq('warehouse_id', wh.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
        console.error("Supabase Error:", error);
        return [];
    }

    // Cast Type กลับไปให้ถูกต้อง
    return (data as unknown as TransactionLog[]) || [];

  } catch (error) {
    console.error("History Action Error:", error);
    return [];
  }
}