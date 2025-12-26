// components/auth/LoginForm.tsx
'use client';

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/actions/auth-actions';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <button 
      disabled={pending}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? <Loader2 className="animate-spin" /> : <KeyRound size={20} />} 
      {pending ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
    </button>
  );
};

export default function LoginForm() {
  // ใช้ useFormState เพื่อรับค่า Error จาก Server Action
  const [state, formAction] = useFormState(login, null);

  return (
    <form action={formAction} className="space-y-4 relative z-10">
      
      {/* Error Message Box */}
      {state?.success === false && (
        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-sm font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {state.message}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
        <input 
          name="email" 
          type="email" 
          required
          placeholder="admin@wms.com"
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-slate-800"
        />
      </div>
      
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Password</label>
        <input 
          name="password" 
          type="password" 
          required
          placeholder="••••••••"
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-slate-800"
        />
      </div>

      <SubmitButton />

      <p className="text-xs text-center text-slate-400 mt-4">
        (ยังไม่มีบัญชี? กรุณาติดต่อ Admin เพื่อสร้าง User ใน Supabase)
      </p>
    </form>
  );
}