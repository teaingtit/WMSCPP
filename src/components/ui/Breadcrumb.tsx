'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const parent = items.length >= 2 ? items[items.length - 2] : null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm ${className ?? ''}`}>
      {/* Mobile: single "Back to [parent]" link */}
      {parent?.href && (
        <Link
          href={parent.href}
          className="flex items-center gap-1 text-slate-500 hover:text-primary sm:hidden"
        >
          <ChevronLeft size={14} aria-hidden />
          <span>กลับไป {parent.label}</span>
        </Link>
      )}

      {/* Desktop: full trail */}
      <div className="hidden sm:flex sm:items-center sm:gap-2">
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="text-slate-500 hover:text-primary truncate">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-800 font-medium truncate" aria-current="page">
                {item.label}
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </nav>
  );
}
