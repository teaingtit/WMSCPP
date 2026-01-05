'use client';

import React, { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarAccordionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarAccordion({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: SidebarAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} />}
          <span>{title}</span>
        </div>
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-200', isOpen ? 'rotate-180' : '')}
        />
      </button>

      <div
        className={cn(
          'space-y-1 overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
