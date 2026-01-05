// components/auth/LoginForm.tsx
'use client';

import React, { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/actions/auth-actions';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalLoading } from '@/components/providers/GlobalLoadingProvider';
// 1. กำหนดค่าเริ่มต้นให้ตรงกับ Type (LoginState)
const initialState = {
  success: false,
  message: '',
};

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? <Loader2 className="animate-spin" /> : <KeyRound size={20} />}
      {pending ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
    </button>
  );
};

export default function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);
  const { setIsLoading } = useGlobalLoading();
  // ✅ ใช้ useEffect ดักจับ state เพื่อแสดง Toast
  useEffect(() => {
    if (state?.message) {
      if (state.success === false) {
        toast.error(state.message); // ❌ แสดง Error สีแดง
      } else {
        toast.success(state.message); // ✅ แสดง Success สีเขียว
      }
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 relative z-10">
      {/* ลบ Error Box เดิมออก เพราะเราใช้ Toast แล้ว */}

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
          Email Address
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="admin@wms.com"
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-800"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
          Password
        </label>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-800"
        />
      </div>

      <SubmitButton />

      <p className="text-xs text-center text-slate-400 mt-4">
        (ยังไม่มีบัญชี? กรุณาติดต่อ Admin เพื่อสร้าง User ใน Supabase)
      </p>
    </form>
  );
}
