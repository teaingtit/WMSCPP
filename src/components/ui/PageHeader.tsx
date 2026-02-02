// components/ui/PageHeader.tsx
'use client';
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  warehouseId?: string;
  action?: React.ReactNode;
  backHref?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8',
        className,
      )}
    >
      <div className="flex items-start sm:items-center gap-3">
        {/* Back Button */}
        {backHref && (
          <Link
            href={backHref}
            className="p-2 -ml-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 active:scale-95"
          >
            <ChevronLeft size={24} />
          </Link>
        )}

        {/* Icon */}
        {icon && (
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
        )}

        {/* Title & Subtitle */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Action Area */}
      {action && <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">{action}</div>}
    </div>
  );
}

// New: Compact header variant for mobile-first design
export function PageHeaderCompact({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between py-3 px-1', className)}>
      <h1 className="text-lg font-bold text-white truncate">{title}</h1>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
