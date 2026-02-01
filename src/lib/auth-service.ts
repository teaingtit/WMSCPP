// lib/auth-service.ts
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AppUser } from '@/types/auth';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { ROLES, TABLES } from '@/lib/constants';

type UserWithBanned = User & { banned_until?: string | null };

export async function checkManagerRole(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from(TABLES.USER_ROLES)
    .select('role')
    .eq('user_id', userId)
    .single();
  const role = profile?.role;
  if (!role) return false;
  return [ROLES.ADMIN, ROLES.MANAGER].includes(role);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // ดึง Role และสถานะ — use admin client so we always see user_roles (same as login; avoids RLS/session).
  // Keep role/allowed_warehouses in DB only (not in JWT) to avoid large session cookies and Headers Overflow.
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from(TABLES.USER_ROLES)
    .select('role, allowed_warehouses, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  // 🚨 SECURITY FIX: ถ้าหา Role ไม่เจอ ให้ Return null (ไม่ assume ว่าเป็น staff)
  // เพื่อป้องกันคนนอกที่หลุดเข้ามาใช้งานระบบโดยไม่ได้รับอนุญาต
  if (!roleData || roleError) {
    console.error(`Security Alert: User ${user.id} has no role assigned.`);
    return null;
  }

  // ✅ SECURITY FIX 2: เช็คสถานะ Banned และ Inactive
  // ถ้าโดนแบนใน Supabase Auth หรือถูกตั้งค่าเป็น Inactive ในระบบ -> ไม่อนุญาตให้เข้าระบบ
  // The `banned_until` property might not exist on the `User` type in older library versions.
  const userWithBanned = user as UserWithBanned;
  const isBanned =
    userWithBanned.banned_until != null && new Date(userWithBanned.banned_until) > new Date();
  const isActive = roleData.is_active;

  if (isBanned || !isActive) {
    console.warn(`Access Denied: User ${user.id} is ${isBanned ? 'banned' : 'inactive'}.`);
    // เพื่อความปลอดภัยสูงสุด อาจพิจารณา signOut() user ออกจากระบบไปเลย
    // await supabase.auth.signOut();
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
    role: roleData.role as 'admin' | 'staff', // มั่นใจได้ว่าเป็นค่าที่ถูกต้อง
    allowed_warehouses: roleData.allowed_warehouses || [],
    created_at: user.created_at,
    is_active: isActive,
    is_banned: isBanned,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    // ถ้าไม่มี User หรือ ไม่มี Role -> เด้งออกไป Login
    redirect('/login');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== ROLES.ADMIN) {
    redirect('/dashboard');
  }
  return user;
}
