// actions/auth-actions.ts
'use server';

// เปลี่ยนการ import
import { createClient } from '@/lib/supabase-server'; 
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function login(prevState: any, formData: FormData) {
  // สร้าง client ใหม่ทุกครั้งที่มีการ request
  const supabase = createClient(); 

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login Error:", error.message);
      return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    }
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}