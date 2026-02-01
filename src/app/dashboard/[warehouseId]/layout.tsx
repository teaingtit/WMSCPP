// app/dashboard/[warehouseId]/layout.tsx
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-service';
import WarehouseHeader from '@/components/ui/WarehouseHeader';
import { isValidUUID } from '@/lib/utils';

export default async function WarehouseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ warehouseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { warehouseId } = await params;
  const decodedId = decodeURIComponent(warehouseId);

  // ✅ FIX: Handle both UUID and code identifiers, use maybeSingle() to avoid PGRST116 error
  let warehouseQuery = supabase.from('warehouses').select('id, name, code, is_active');

  // If it's a UUID, query by id; otherwise query by code
  if (isValidUUID(decodedId)) {
    warehouseQuery = warehouseQuery.eq('id', decodedId);
  } else {
    warehouseQuery = warehouseQuery.eq('code', decodedId);
  }

  const { data: warehouse, error } = await warehouseQuery.maybeSingle();

  if (error) {
    console.error(`Error fetching warehouse ${decodedId} (raw: ${warehouseId}):`, error);
  }

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
      <div className="flex-1 p-4 sm:p-6 overflow-auto">{children}</div>
    </div>
  );
}
