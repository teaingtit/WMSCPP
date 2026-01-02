'use server';

import { AuditItem } from '@/types/inventory';
import { createClient } from '@/lib/db/supabase-server';
import { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Helper Functions ---
async function checkManagerRole(supabase: any, userId: string) {
    const { data: profile } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
    const role = profile?.role;
    if (!role) return false;
  return ['admin', 'manager'].includes(role);
}
/**
 * Resolves a warehouse identifier (code or UUID) to a UUID.
 * Suggestion: Move this to a shared utility file (e.g., /lib/utils/db-helpers.ts)
 * to be used across different action files.
 */
async function getWarehouseId(supabase: SupabaseClient, warehouseIdentifier: string): Promise<string | null> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(warehouseIdentifier);
    if (isUUID) return warehouseIdentifier;
    
    const { data } = await supabase
        .from('warehouses')
        .select('id')
        .eq('code', warehouseIdentifier)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

    return data?.id ?? null;
}

// --- Create Session ---
const CreateAuditSchema = z.object({
  warehouseId: z.string().min(1),
  name: z.string().min(1, "กรุณาระบุชื่อรอบการนับ"),
});

export async function createAuditSession(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthenticated' };
  const isManager = await checkManagerRole(supabase, user.id);
  if (!isManager) {
      return { success: false, message: 'ไม่มีสิทธิ์เปิดรอบการนับ (Requires Manager/Admin)' };
  }


  const rawData = {
    warehouseId: formData.get('warehouseId'),
    name: formData.get('name'),
  };
  const validated = CreateAuditSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, message: validated.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  }
  const { warehouseId, name } = validated.data;

  try {
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) {
        throw new Error(`ไม่พบคลังสินค้า: ${warehouseId}`);
    }

    // Call RPC: init_audit_session
    const { data: sessionId, error } = await supabase.rpc('init_audit_session', {
      p_warehouse_id: whId,
      p_name: name,
      p_user_id: user.id
    });

    if (error) throw error;

    revalidatePath(`/dashboard/${warehouseId}/audit`);
    return { success: true, message: 'เปิดรอบการนับสำเร็จ', sessionId };

  } catch (error: any) {
    console.error("Create Audit Error:", error);
    return { success: false, message: error.message };
  }
}

// --- Fetch Data ---
export async function getAuditSessions(warehouseId: string) {
    const supabase = await createClient();
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) return [];

    const { data } = await supabase
        .from('audit_sessions')
        .select('*')
        .eq('warehouse_id', whId)
        .order('created_at', { ascending: false });
        
    return data || [];
}

export async function getAuditItems(sessionId: string): Promise<AuditItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('audit_items')
        .select(`
            *,
            product:products (sku, name, uom, image_url),
            location:locations!audit_items_location_id_fkey (code, lot, cart, level)
        `)
        .eq('session_id', sessionId)
        .order('location(code)', { ascending: true }); // เรียงตาม Location เพื่อให้นับง่าย

    if (error) {
        console.error("Error fetching audit items:", error.message);
        if (error.message.includes("embedded resource")) {
            console.error("Hint: ตรวจสอบ Foreign Key ระหว่าง audit_items และ locations ใน Database");
        }
        return [];
    }
    
    // The data structure from Supabase with aliased relations now matches our AuditItem type.
    return data as AuditItem[];
}

export async function getAuditSessionById(sessionId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('audit_sessions')
        .select('*')
        .eq('id', sessionId)
        .single(); // Use single() as we expect exactly one result
        
    return data; // Can be null if not found
}

// --- Submit Count (นับสินค้า) ---
export async function updateAuditItemCount(itemId: string, qty: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };

    try {
        const { error } = await supabase
            .from('audit_items')
            .update({ 
                counted_qty: qty,
                status: 'COUNTED',
                counter_id: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', itemId);

        if (error) throw error;
        
        // Revalidate หน้า Audit Detail (จะระบุ path ทีหลังเมื่อสร้าง UI)
        return { success: true, message: 'บันทึกจำนวนที่นับสำเร็จ' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// --- Finalize (ปิดจ๊อบ) ---
export async function finalizeAuditSession(sessionId: string, warehouseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthenticated' };
    const isManager = await checkManagerRole(supabase, user.id);
  if (!isManager) {
      return { success: false, message: 'ไม่มีสิทธิ์อนุมัติการปรับยอด (Requires Manager/Admin)' };
  }


    try {
        const { data, error } = await supabase.rpc('process_audit_adjustment', {
            p_session_id: sessionId,
            p_user_id: user.id,
            p_user_email: user.email
        });

        if (error) throw error;

        revalidatePath(`/dashboard/${warehouseId}/inventory`); // รีเฟรชหน้า Stock หลัก
        return { success: true, message: 'ปรับยอดสต็อกเรียบร้อยแล้ว' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}