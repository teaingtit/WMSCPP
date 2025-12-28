// actions/auth-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server'; 
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Define State Type
interface LoginState {
  success?: boolean;
  message?: string;
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
      return { success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login Error:", error.message);
      // แปล Error Message ให้ User เข้าใจง่าย
      if (error.message.includes("Invalid login")) {
          return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
      }
      return { success: false, message: error.message };
    }
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout'); // Clear Cache ทั้งหมด
  redirect('/login');
}