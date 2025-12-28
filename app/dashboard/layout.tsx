// app/dashboard/layout.tsx
import React from 'react';
import MobileNav from '@/components/ui/MobileNav';
import DesktopSidebar from '@/components/ui/DesktopSidebar'; // ✅ Import Component ใหม่

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row">
      
      {/* 1. Mobile Navigation (แสดงเฉพาะ Mobile) */}
      <MobileNav />

      {/* 2. Desktop Sidebar (แสดงเฉพาะ Desktop, Logic อยู่ใน Component) */}
      <DesktopSidebar />

      {/* 3. Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50 relative w-full">
        {children}
      </main>
    </div>
  );
}