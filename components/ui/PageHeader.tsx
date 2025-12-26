// components/ui/PageHeader.tsx
'use client';
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  warehouseId: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: any) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
           {subtitle && <p className="text-slate-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}