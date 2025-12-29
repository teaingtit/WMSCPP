// lib/auth-service.ts
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { AppUser } from '@/types/auth';

// 1. ฟังก์ชันดึง User ปัจจุบันพร้อม Role
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();

  // ดึง User จาก Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // ✅ Check 1: ถ้าไม่มี User หรือ Error ให้ตัดจบเลย
  if (error || !user) {
    return null;
  }

  // ✅ Check 2: ดึง Role (ใช้ user.id ได้เลยเพราะผ่าน Check 1 มาแล้ว)
  // เราใช้ user!.id เพื่อบอก TS ว่า "ฉันเช็คแล้ว มันมีค่าแน่ๆ"
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, allowed_warehouses')
    .eq('user_id', user.id)
    .single();

  // --- 🕵️ DEBUG LOG START (ดูที่ Terminal ของ VS Code) ---
  //console.log("🔍 DEBUG AUTH CHECK 🔍");
  //.log("User Email:", user.email);
  //.log("User ID:", user.id);
  //.log("DB Role Data:", roleData); // ถ้าเป็น null แสดงว่า SQL Insert ไม่สำเร็จ หรือผิด ID
  //.log("DB Error:", roleError);    // ถ้ามี Error แสดงว่าติด RLS หรือตารางไม่มีอยู่จริง
  //.log("-----------------------");
  // --- DEBUG LOG END ---

  return {
    id: user.id,
    email: user.email!, // ใส่ ! ยืนยันว่ามี email
    // ถ้า roleData หาไม่เจอ -> ให้เป็น 'staff' (นี่คือสาเหตุที่คุณเห็นเป็น staff ตลอด)
    role: (roleData?.role as 'admin' | 'staff') || 'staff',
    allowed_warehouses: roleData?.allowed_warehouses || [],
    created_at: user.created_at
  };
}

// 2. Guard: บังคับว่าต้อง Login
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

// 3. Guard: บังคับ Admin
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    redirect('/dashboard'); 
  }
  return user;
}