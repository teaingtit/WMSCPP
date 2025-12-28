// components/ui/PageHeader.tsx
'use client';
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  warehouseId: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
           {/* ใช้ Conditional Rendering แบบ Safe Check */}
           {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {/* Action Area (ปุ่มต่างๆ) */}
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}