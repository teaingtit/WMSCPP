import Link from 'next/link';
import React from 'react';

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  tag: string;
  title: string;
  description: string;
  variant?: 'primary' | 'secondary';
}

export function ActionCard({
  href,
  icon,
  tag,
  title,
  description,
  variant = 'secondary',
}: ActionCardProps) {
  const baseClasses =
    'group rounded-3xl p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all transform hover:-translate-y-1 hover:scale-[1.02] hover:brightness-110 flex items-center gap-5 relative overflow-hidden backdrop-blur-md border border-white/10';

  // Define vibrant glossy 3D gradients based on variant/tag
  let colorClasses = '';
  let iconBgClass = '';

  if (tag === 'INBOUND') {
    colorClasses =
      'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 shadow-emerald-900/40';
    iconBgClass =
      'bg-gradient-to-b from-white/20 to-white/5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/20';
  } else if (tag === 'OUTBOUND') {
    colorClasses = 'bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 shadow-rose-900/40';
    iconBgClass =
      'bg-gradient-to-b from-white/20 to-white/5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/20';
  } else if (tag === 'TRANSFER') {
    colorClasses = 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-blue-900/40';
    iconBgClass =
      'bg-gradient-to-b from-white/20 to-white/5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/20';
  } else {
    colorClasses =
      'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-slate-900/40';
    iconBgClass =
      'bg-gradient-to-b from-white/10 to-white/5 text-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10';
  }

  return (
    <Link href={href} className="block h-full">
      <div className={`${baseClasses} ${colorClasses}`}>
        {/* Gloss/Shine Effect */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none"></div>

        {/* Icon */}
        <div className={`p-3.5 rounded-2xl flex-shrink-0 z-10 shadow-lg ${iconBgClass}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest drop-shadow-md">
              {tag}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white leading-tight drop-shadow-md">{title}</h3>
          <p className="text-xs font-medium text-slate-100/70 truncate mt-1">{description}</p>
        </div>

        {/* Arrow Hint */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 text-white/50">
          {/* You could add an arrow icon here if desired */}
        </div>
      </div>
    </Link>
  );
}
