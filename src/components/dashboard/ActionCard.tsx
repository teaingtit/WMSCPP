import Link from 'next/link';
import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  tag: string;
  title: string;
  description: string;
  variant?: 'primary' | 'secondary';
}

interface TagStyle {
  gradient: string;
  glow: string;
  badge: string;
}

const tagStyles: Record<string, TagStyle> = {
  INBOUND: {
    gradient: 'from-emerald-500 via-emerald-600 to-teal-700',
    glow: 'group-hover:shadow-emerald-500/30',
    badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  },
  OUTBOUND: {
    gradient: 'from-rose-500 via-rose-600 to-red-700',
    glow: 'group-hover:shadow-rose-500/30',
    badge: 'bg-rose-400/20 text-rose-300 border-rose-400/30',
  },
  TRANSFER: {
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    glow: 'group-hover:shadow-blue-500/30',
    badge: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  },
};

const defaultStyle: TagStyle = {
  gradient: 'from-slate-600 via-slate-700 to-slate-800',
  glow: 'group-hover:shadow-slate-500/20',
  badge: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
};

export function ActionCard({ href, icon, tag, title, description }: ActionCardProps) {
  const styles = tagStyles[tag] ?? defaultStyle;

  return (
    <Link href={href} className="block h-full group">
      <div
        className={cn(
          // Base styles
          'relative h-full rounded-2xl p-5 sm:p-6 overflow-hidden',
          'flex items-center gap-4 sm:gap-5',
          'transition-all duration-300 ease-out',

          // Gradient background
          `bg-gradient-to-br ${styles.gradient}`,

          // Interactive effects
          'hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]',
          'shadow-lg hover:shadow-2xl',
          styles.glow,

          // Border
          'border border-white/10',
        )}
      >
        {/* Decorative shine effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/10 pointer-events-none" />
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

        {/* Icon Container */}
        <div className="relative z-10 flex-shrink-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 min-w-0">
          {/* Tag Badge */}
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider mb-2 border',
              styles.badge,
            )}
          >
            {tag}
          </span>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-sm">
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-white/70 mt-1 truncate">{description}</p>
        </div>

        {/* Arrow Indicator */}
        <div className="relative z-10 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
          <ArrowRight size={20} className="text-white/60" />
        </div>
      </div>
    </Link>
  );
}
