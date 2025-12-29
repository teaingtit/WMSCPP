import React from 'react';
import { redirect } from 'next/navigation';
import MobileNav from '@/components/ui/MobileNav';
import DesktopSidebar from '@/components/ui/DesktopSidebar';
import UserProvider from '@/components/providers/UserProvider';
import { getCurrentUser } from '@/lib/auth-service';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ✅ 1. Single Point of Fetching: ดึงครั้งเดียวที่นี่ มีประสิทธิภาพสูงสุด
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    // ✅ 2. Wrap ด้วย Provider เพื่อส่งข้อมูล User ไปทั่วทั้ง Dashboard (Client Side)
    <UserProvider user={user}>
      <div className="flex h-screen overflow-hidden flex-col md:flex-row">
        
        {/* Mobile Nav */}
        <MobileNav />

        {/* Desktop Sidebar: ไม่ต้องส่ง props แล้ว ใช้ Context ภายในเอา */}
        <DesktopSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-slate-50 relative w-full">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}