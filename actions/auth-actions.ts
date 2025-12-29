// actions/auth-actions.ts
'use server';

import { createClient } from '@/lib/supabase-server'; 
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { loginSchema } from '@/lib/schemas/auth-schemas';

interface LoginState {
  success?: boolean;
  message?: string;
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  // 1. Validate Input
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const validatedFields = loginSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { 
      success: false, 
      // ป้องกัน undefined ด้วย ?. และ ??
      message: validatedFields.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' 
    };
  }

  const { email, password } = validatedFields.data;
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login Error:", error.message);
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
  revalidatePath('/', 'layout');
  redirect('/login');
}