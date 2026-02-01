// app/(auth)/login/page.tsx
import LoginForm from '@/components/auth/LoginForm';
import { Box } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ (Login) - WMS DEMO',
  description: 'ระบบจัดการคลังสินค้า',
};

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-900 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-hidden relative flex-shrink-0 my-auto">
        {/* Decorative Circle */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-2xl opacity-20"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-sm">
            <Box size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">WMS DEMO Portal</h1>
          <p className="text-slate-500 mt-2">เข้าสู่ระบบจัดการคลังสินค้า</p>
        </div>

        {/* เรียกใช้ Client Component */}
        <LoginForm />
      </div>
    </div>
  );
}
