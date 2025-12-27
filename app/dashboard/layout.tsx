import React from 'react';
import Link from 'next/link';
import { Package, Settings, LogOut } from 'lucide-react';
import { logout } from '@/actions/auth-actions'; // ✅ Import Action ล็อกเอาท์

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (Static สำหรับทุกหน้า) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
       <Link href="/dashboard" className="p-6 border-b border-slate-800 flex items-center gap-3 hover:bg-slate-800 transition-colors cursor-pointer group">
          <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-500 transition-colors">
            <Package size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight">WMS Pro</span>
        </Link>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
          >
            <Package size={18} /> เลือกคลังสินค้า
          </Link>
          <Link 
            href="/dashboard/settings" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 font-medium hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Settings size={18} /> ตั้งค่าระบบ
          </Link>
        </nav>

        {/* ✅ Logout Form Section */}
        <div className="p-4 border-t border-slate-800">
          <form action={logout}>
            <button 
              type="submit"
              className="flex items-center gap-3 w-full px-4 py-3 text-rose-400 hover:bg-rose-900/20 hover:text-rose-300 rounded-xl transition-colors"
            >
              <LogOut size={18} /> ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50 relative">
        {children}
      </main>
    </div>
  );
}