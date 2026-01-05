// app/not-found.tsx
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full">
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion size={40} />
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-2">404 - Page Not Found</h2>
        <p className="text-slate-500 mb-8 font-medium">
          ไม่พบหน้าที่คุณต้องการ หรือคุณอาจไม่มีสิทธิ์เข้าถึงคลังสินค้านี้
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          <Home size={18} /> กลับไปหน้าเลือกคลัง
        </Link>
      </div>
    </div>
  );
}
