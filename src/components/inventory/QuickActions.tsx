import Link from 'next/link';
import { LogOut, ArrowDownToLine, ArrowRightLeft } from 'lucide-react';

interface QuickActionsProps {
  warehouseId: string;
}

export function QuickActions({ warehouseId }: QuickActionsProps) {
  const actions = [
    {
      href: `/dashboard/${warehouseId}/inbound`,
      icon: <ArrowDownToLine size={20} />,
      tag: 'INBOUND',
      title: 'รับสินค้าเข้า',
      description: 'บันทึกสินค้าใหม่',
      color: 'bg-emerald-500',
      hoverColor: 'hover:bg-emerald-600',
      textColor: 'text-emerald-600',
    },
    {
      href: `/dashboard/${warehouseId}/outbound`,
      icon: <LogOut size={20} />,
      tag: 'OUTBOUND',
      title: 'เบิกจ่ายสินค้า',
      description: 'ตัดสต็อก/เบิกใช้',
      color: 'bg-rose-500',
      hoverColor: 'hover:bg-rose-600',
      textColor: 'text-rose-600',
    },
    {
      href: `/dashboard/${warehouseId}/transfer`,
      icon: <ArrowRightLeft size={20} />,
      tag: 'TRANSFER',
      title: 'ย้ายตำแหน่ง',
      description: 'ย้ายภายในคลัง',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      textColor: 'text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {actions.map((action) => (
        <Link key={action.tag} href={action.href} className="block group">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${action.color} ${action.hoverColor}`}
            >
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${action.textColor}`}
              >
                {action.tag}
              </span>
              <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                {action.title}
              </h3>
              <p className="text-xs text-slate-500 truncate">{action.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
