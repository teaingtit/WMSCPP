// components/ui/PageHeader.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  warehouseId: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, warehouseId, action }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm mb-6 rounded-xl">
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <button 
           onClick={() => router.back()}
           className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
           <ArrowLeft size={20} />
        </button>

        {/* Home Button */}
        <button 
           onClick={() => router.push(`/dashboard/${warehouseId}`)}
           className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
        >
           <Home size={20} />
        </button>

        <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

        <div>
           <h1 className="text-xl font-bold text-slate-800">{title}</h1>
           {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}