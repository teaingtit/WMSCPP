import React from 'react';
import { redirect } from 'next/navigation';
import BottomNavWrapper from '@/components/ui/BottomNavWrapper';
import TopNav from '@/components/ui/TopNav';
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
      <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        {/* Top Nav (Visible only on desktop) */}
        <TopNav />

        {/* Main Content - Mobile-First padding for bottom nav */}
        <main
          id="main-content"
          className="flex flex-1 flex-col overflow-auto relative w-full custom-scrollbar pb-20 md:pb-0"
        >
          <div className="flex-1 min-h-0 w-full">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNavWrapper />
      </div>
    </UserProvider>
  );
}
