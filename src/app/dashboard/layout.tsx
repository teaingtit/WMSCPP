import React from 'react';
import { redirect } from 'next/navigation';
import MobileNav from '@/components/ui/MobileNav';
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
      <div className="flex h-screen overflow-hidden flex-col bg-gradient-to-b from-[#122247] to-[#1e293b]">
        {/* Mobile Nav (Visible only on mobile) */}
        <MobileNav />

        {/* Top Nav (Visible only on desktop) */}
        <TopNav />

        {/* Main Content */}
        <main className="flex-1 overflow-auto relative w-full">{children}</main>
      </div>
    </UserProvider>
  );
}
