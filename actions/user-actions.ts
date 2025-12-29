// actions/user-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schema Validation (กำหนด message แทน errorMap เพื่อเลี่ยง TS Error)
const createUserSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  role: z.enum(['admin', 'staff'], { 
    message: 'บทบาทต้องเป็น admin หรือ staff เท่านั้น' 
  }),
});

export async function getUsers() {
  const supabase = await createClient();
  
  // Security: ตรวจสอบว่าเป็น Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (myRole?.role !== 'admin') return [];

  // ใช้ supabaseAdmin เพื่อดึง Users ทั้งหมด (Bypass RLS)
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error || !users.users) return [];

  const { data: roles } = await supabase.from('user_roles').select('*');

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

export async function createUser(formData: FormData) {
  // 1. Validate
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  };

  const validatedFields = createUserSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { 
        success: false, 
        message: validatedFields.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' 
    };
  }

  const { email, password, role } = validatedFields.data;
  const warehouses = formData.getAll('warehouses') as string[];

  try {
    // 2. Create User (Supabase Auth)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true 
    });

    if (error) throw error;
    if (!data.user) throw new Error("User creation failed");

    // 3. Create Role (DB)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: data.user.id,
        role,
        allowed_warehouses: role === 'admin' ? [] : warehouses 
      });

    if (roleError) {
        // Rollback: ลบ User ทิ้งถ้าบันทึก Role ไม่ผ่าน
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        throw roleError;
    }

    revalidatePath('/dashboard/settings');
    return { success: true, message: `สร้างผู้ใช้ ${email} สำเร็จ` };

  } catch (error: any) {
    if (error.message?.includes('already been registered')) {
        return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' };
    }
    return { success: false, message: error.message };
  }
}

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