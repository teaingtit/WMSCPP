'use server';

import { AuditItem } from '@/types/inventory';
import { createClient } from '@/lib/db/supabase-server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { checkManagerRole } from '@/lib/auth-service';
import { withAuth } from '@/lib/action-utils';


// --- Create Session ---
const CreateAuditSchema = z.object({
  warehouseId: z.string().min(1),
  name: z.string().min(1, "กรุณาระบุชื่อรอบการนับ"),
  items: z.string().optional(), // JSON string: { inventory_id }[]
});

export const createAuditSession = withAuth(async (formData: FormData, { user, supabase }) => {
  const rawData = {
    warehouseId: formData.get('warehouseId') ?? '',
    name: formData.get('name') ?? '',
    items: formData.get('items') ?? undefined,
  };
  const validated = CreateAuditSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, message: validated.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  }
  const { warehouseId, name, items } = validated.data;

  try {
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) {
        throw new Error(`ไม่พบคลังสินค้า: ${warehouseId}`);
    }

    // Check for duplicate name in the same warehouse
    const { data: existingSession } = await supabase
        .from('audit_sessions')
        .select('id')
        .eq('warehouse_id', whId)
        .eq('name', name)
        .maybeSingle();

    if (existingSession) {
        return { success: false, message: `ชื่อรอบการนับ "${name}" มีอยู่แล้วในคลังสินค้านี้ กรุณาใช้ชื่ออื่น` };
    }

    // 1. Create Audit Session (Manual Insert)
    const { data: session, error: sessionError } = await supabase
        .from('audit_sessions')
        .insert({
            warehouse_id: whId,
            name: name,
            created_by: user.id,
            status: 'OPEN'
        })
        .select('id')
        .single();

    if (sessionError) throw sessionError;
    const sessionId = session.id;

    // 2. Process Selected Items
    let auditItemsPayload: any[] = [];
    let selectedItems: any[] = [];

    if (items && typeof items === 'string' && items.length > 0) {
        try {
            const parsed = JSON.parse(items);
            if (Array.isArray(parsed)) selectedItems = parsed;
        } catch (e) {
            console.error("Error parsing items JSON:", e);
        }
    }

    if (selectedItems.length > 0) {
        // --- PARTIAL AUDIT (Selected Items) ---
        const inventoryIds = selectedItems.map((i: any) => i.inventory_id);
        
        const { data: inventoryData } = await supabase
            .from('stocks')
            .select('id, product_id, location_id, quantity')
            .in('id', inventoryIds);
        
        const invMap = new Map(inventoryData?.map((i: any) => [i.id, i]));

        auditItemsPayload = selectedItems.map((item: any) => {
            const inv = invMap.get(item.inventory_id);
            if (!inv) return null;
            return {
                session_id: sessionId,
                product_id: inv.product_id,
                location_id: inv.location_id,
                system_qty: inv.quantity,
                status: 'PENDING'
            };
        }).filter(Boolean);
    } else {
        // --- FULL AUDIT (Snapshot All) ---
        // กรณีไม่ได้เลือกสินค้ามา (items = empty/null) ให้ดึงสินค้าทั้งหมดในคลังที่มี quantity > 0
        const { data: allStocks } = await supabase
            .from('stocks')
            .select('product_id, location_id, quantity')
            .eq('warehouse_id', whId)
            .gt('quantity', 0);

        if (allStocks) {
            auditItemsPayload = allStocks.map(s => ({
                session_id: sessionId,
                product_id: s.product_id,
                location_id: s.location_id,
                system_qty: s.quantity,
                status: 'PENDING'
            }));
        }
    }

    // 3. Insert Audit Items
    if (auditItemsPayload.length > 0) {
        const { error: itemsError } = await supabase
            .from('audit_items')
            .insert(auditItemsPayload);
        
        if (itemsError) throw itemsError;
    }

    revalidatePath(`/dashboard/${warehouseId}/audit`);
    return { success: true, message: 'เปิดรอบการนับสำเร็จ', sessionId };

  } catch (error: any) {
    console.error("Create Audit Error:", error);
    return { success: false, message: error.message };
  }
}, { requiredRole: 'manager' }); // Enforce Manager Role

// --- Fetch Data ---
export async function getInventoryItems(warehouseId: string) {
    const supabase = await createClient();
    const whId = await getWarehouseId(supabase, warehouseId);
    if (!whId) return [];

    const { data, error } = await supabase
        .from('stocks')
        .select(`
            id,
            quantity,
            product:products (id, sku, name, image_url),
            location:locations!inner (id, code)
        `)
        .eq('warehouse_id', whId);

    if (error) {
        console.error("getInventoryItems Error:", error.message);
        return [];
    }
    return data || [];
}

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
        .order('code', { foreignTable: 'location', ascending: true }); // เรียงตาม Location เพื่อให้นับง่าย

    if (error) {
        console.error("Error fetching audit items:", error.message);
        return [];
    }
    
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
                counter_id: user.id, // Record who *actually* counted it
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

// --- Update Session (แก้ไขข้อมูล) ---
export async function updateAuditSession(sessionId: string, warehouseId: string, data: { name: string }) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('audit_sessions')
        .update(data)
        .eq('id', sessionId);
    
    if (error) return { success: false, message: error.message };
    revalidatePath(`/dashboard/${warehouseId}/audit`);
    return { success: true, message: 'อัปเดตข้อมูลสำเร็จ' };
}