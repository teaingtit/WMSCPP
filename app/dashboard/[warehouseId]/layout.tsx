// app/dashboard/[warehouseId]/layout.tsx
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-service';
import WarehouseHeader from '@/components/ui/WarehouseHeader'; // สมมติว่ามี Header แยกของคลัง

export default async function WarehouseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { warehouseId: string }; // หมายเหตุ: warehouseId ใน URL คือ Code (เช่น WH-001)
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { warehouseId } = params;

  // 1. ตรวจสอบว่ามีคลังสินค้านี้อยู่จริงหรือไม่ + RLS จะช่วยเช็คสิทธิ์ให้อัตโนมัติ!
  // ถ้า User ไม่มีสิทธิ์ RLS จะทำให้หาไม่เจอ (return null)
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('id, name, code')
    .eq('code', warehouseId) // เช็คจาก Code ใน URL
    .single();

  if (!warehouse) {
    // กรณีไม่เจอ หรือ ไม่มีสิทธิ์ (RLS Blocked)
    // ให้เช็คว่าเป็น Admin ไหม? ถ้า Admin ไม่เห็นแสดงว่าคลังไม่มีจริง (404)
    // แต่ถ้าเป็น Staff ไม่เห็น แสดงว่าอาจไม่มีสิทธิ์ -> Redirect กลับ
    if (user.role === 'admin') {
        notFound();
    } else {
        redirect('/dashboard'); // ดีดกลับหน้ารวมคลังสินค้า
    }
  }

  // 2. (Optional) Double Check สำหรับ Staff (ถ้าไม่ได้เปิด RLS หรือ RLS หลุด)
  if (user.role !== 'admin') {
      const hasAccess = user.allowed_warehouses.includes(warehouseId);
      if (!hasAccess) {
          redirect('/dashboard');
      }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ส่งข้อมูลคลังสินค้าไปให้ Header เพื่อแสดงชื่อคลัง */}
      <WarehouseHeader warehouse={warehouse} user={user} />
      
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {children}
      </div>
    </div>
  );
}