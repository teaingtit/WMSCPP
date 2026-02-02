// components/auth/LoginForm.tsx
'use client';

import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login } from '@/actions/auth-actions';
import { KeyRound, Loader2 } from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import { Input } from '@/components/ui/input';
import { useFormErrors } from '@/hooks/useFormErrors';

const initialState = { success: false, message: '' };

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? <Loader2 className="animate-spin" /> : <KeyRound size={20} />}
      {pending ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
    </button>
  );
};

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);
  const { getError } = useFormErrors(state ?? initialState);

  useEffect(() => {
    if (state?.message) {
      notify.ok(state);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 relative z-10">
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider"
        >
          อีเมล (Email)
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="admin@wms.com"
          className="bg-slate-50 border-slate-200 font-medium text-slate-800"
          errorMessage={getError('email')}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider"
        >
          รหัสผ่าน (Password)
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="bg-slate-50 border-slate-200 font-medium text-slate-800"
          errorMessage={getError('password')}
        />
      </div>

      <SubmitButton />

      <p className="text-xs text-center text-slate-500 mt-4">
        (ยังไม่มีบัญชี? กรุณาติดต่อ Admin เพื่อสร้าง User ใน Supabase)
      </p>
    </form>
  );
}
