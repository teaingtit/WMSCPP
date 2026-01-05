// app/dashboard/[warehouseId]/layout.tsx
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-service';
import WarehouseHeader from '@/components/ui/WarehouseHeader';

export default async function WarehouseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { warehouseId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { warehouseId } = params;

  // ✅ FIX: เพิ่ม is_active ใน select เพื่อให้ WarehouseHeader ไม่ error
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('id, name, code, is_active')
    .eq('code', warehouseId)
    .single();

  if (!warehouse) {
    if (user.role === 'admin') {
      notFound();
    } else {
      redirect('/dashboard');
    }
  }

  // Security Check (กัน Staff แอบเข้าคลังอื่น)
  if (user.role !== 'admin') {
    const hasAccess = user.allowed_warehouses.includes(warehouseId);
    if (!hasAccess) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <WarehouseHeader warehouse={warehouse} user={user} />
      <div className="flex-1 p-6 overflow-auto">{children}</div>
    </div>
  );
}
