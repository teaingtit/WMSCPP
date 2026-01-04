'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- 1. Schema Validation ---
const baseUserSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  role: z.enum(['admin', 'staff', 'manager'], { 
    message: 'บทบาทต้องเป็น admin, manager หรือ staff เท่านั้น' 
  }),
  first_name: z.string().min(1, "กรุณาระบุชื่อจริง"),
  last_name: z.string().min(1, "กรุณาระบุนามสกุล"),
});

// --- 2. Getters ---
export async function getUsers() {
  const supabase = await createClient();
  
  // Security Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (myRole?.role !== 'admin') return [];

  // Fetch Users using Admin Client
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error || !users) return [];

  // Fetch Roles
  const { data: roles } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role, allowed_warehouses, is_active');
    
  // Fetch Profiles (Names) - Fallback to metadata if profile missing
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, full_name');

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Map Data
  const enrichedUsers = users.map(u => {
    const roleData = roles?.find(r => r.user_id === u.id);
    const profile = profileMap.get(u.id);
    
    // Get Name from Profile -> Metadata -> Email
    const firstName = profile?.first_name || u.user_metadata?.first_name || '';
    const lastName = profile?.last_name || u.user_metadata?.last_name || '';
    const fullName = profile?.full_name || u.user_metadata?.full_name || `${firstName} ${lastName}`.trim();

    const isActive = roleData?.is_active ?? true;
    const isBannedInAuth = (u as any).banned_until !== null && (u as any).banned_until !== undefined;
    
    return {
      id: u.id,
      email: u.email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: roleData?.role || 'staff',
      allowed_warehouses: roleData?.allowed_warehouses || [],
      is_active: isActive,
      is_banned: isBannedInAuth || !isActive 
    };
  });

  // Sort: Active first, then Newest
  return enrichedUsers.sort((a, b) => {
    if (a.is_active === b.is_active) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
  });
}

// --- 3. Create User Mutation ---
export async function createUser(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const firstName = formData.get('first_name') as string;
  const lastName = formData.get('last_name') as string;
  const verifyEmail = formData.get('verify_email') === 'on'; 

  // 1. Validate Input
  const validatedFields = baseUserSchema.safeParse({ email, role, first_name: firstName, last_name: lastName });
  if (!validatedFields.success) {
    return { 
        success: false, 
        message: validatedFields.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' 
    };
  }

  // 2. Validate Password
  if (!verifyEmail) {
    if (!password || password.length < 6) {
        return { success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร (หรือเลือกส่งอีเมลยืนยัน)' };
    }
  }

  const warehouses = formData.getAll('warehouses') as string[];
  const metaData = {
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim()
  };

  try {
    let userData;

    if (verifyEmail) {
        // CASE A: Invite Flow
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: metaData // Pass metadata here
        });
        if (error) throw error;
        userData = data.user;
    } else {
        // CASE B: Manual Create
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metaData // Pass metadata here
        });
        if (error) throw error;
        userData = data.user;
    }

    if (!userData) throw new Error("User creation failed");

    // 3. Create Role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.id,
        role,
        allowed_warehouses: role === 'admin' ? [] : warehouses,
        is_active: true
      });

    if (roleError) {
        await supabaseAdmin.auth.admin.deleteUser(userData.id);
        throw roleError;
    }

    // 4. Update Profile (Manual ensure if trigger failed or for safety)
    // The trigger handles insert on new user, but let's be safe.
    // Actually, trigger relies on metadata, so passing metadata above is key.
    
    revalidatePath('/dashboard/settings');
    
    return { 
        success: true, 
        message: verifyEmail 
            ? `ส่งอีเมลยืนยันไปยัง ${email} เรียบร้อยแล้ว` 
            : `สร้างผู้ใช้ ${email} สำเร็จ` 
    };

  } catch (error: any) {
    if (error.message?.includes('already been registered')) {
        return { success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' };
    }
    return { success: false, message: error.message };
  }
}

// --- 4. Delete & Reactivate ---
export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) return { success: false, message: 'ไม่สามารถลบบัญชีของตัวเองได้' };

    // เช็คประวัติการใช้งาน
    const { count } = await supabaseAdmin
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    const hasHistory = count && count > 0;

    if (hasHistory) {
        // Soft Delete (Ban + Inactive)
        await supabaseAdmin.from('user_roles').update({ is_active: false }).eq('user_id', userId);
        
        const banDuration = 100 * 365 * 24 * 60 * 60 + 's'; // ~100 years
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: banDuration });
        
        if (banError) throw banError;

        revalidatePath('/dashboard/settings');
        return { success: true, message: 'ระงับการใช้งานผู้ใช้เรียบร้อย (มีประวัติในระบบ)' };
    } else {
        // Hard Delete
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;

        revalidatePath('/dashboard/settings');
        return { success: true, message: 'ลบผู้ใช้ถาวรเรียบร้อย' };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function reactivateUser(userId: string) {
    try {
        await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '0s' });
        await supabaseAdmin.from('user_roles').update({ is_active: true }).eq('user_id', userId);
        
        revalidatePath('/dashboard/settings');
        return { success: true, message: 'เปิดใช้งานผู้ใช้ใหม่อีกครั้งสำเร็จ' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}