'use server';

import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin'; // ตัวเทพที่เราเพิ่งสร้าง
import { revalidatePath } from 'next/cache';

// 1. ดึงรายชื่อ User ทั้งหมด (เฉพาะ Admin ถึงเห็น)
export async function getUsers() {
  const supabase = await createClient();
  
  // เช็คก่อนว่าเป็น Admin ไหม
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (myRole?.role !== 'admin') return [];

  // ดึงข้อมูล User + Role
  // เนื่องจาก auth.users เข้าถึงยาก เราจะดึงจาก user_roles แล้ว join ข้อมูล (หรือดึง auth.users ผ่าน admin client ก็ได้)
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error || !users.users) return [];

  // ดึง Role ของทุกคนมาแปะ
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*');

  // Map ข้อมูลรวมกัน
  return users.users.map(u => {
    const roleData = roles?.find(r => r.user_id === u.id);
    return {
      id: u.id,
      email: u.email,
      role: roleData?.role || 'staff',
      allowed_warehouses: roleData?.allowed_warehouses || [],
      created_at: u.created_at
    };
  });
}

// 2. สร้าง User ใหม่
export async function createUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const warehouses = formData.getAll('warehouses') as string[]; // รับเป็น Array

  try {
    // 1. สร้างใน Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // ไม่ต้องรอ Verify Email
    });

    if (error) throw error;
    if (!data.user) throw new Error("User creation failed");

    // 2. บันทึก Role ลงตาราง user_roles
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: data.user.id,
        role,
        allowed_warehouses: role === 'admin' ? [] : warehouses // Admin เข้าได้หมด ไม่ต้องระบุ
      });

    if (roleError) {
        // ถ้าใส่ Role ไม่ผ่าน ให้ลบ User ทิ้งด้วย (Rollback แบบ Manual)
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        throw roleError;
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: `สร้างผู้ใช้ ${email} สำเร็จ` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 3. ลบ User
export async function deleteUser(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'ลบผู้ใช้สำเร็จ' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}