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

export function ActionCard({ href, icon, tag, title, description, variant = 'secondary' }: ActionCardProps) {
  const baseClasses = "group rounded-3xl p-6 shadow-sm transition-all transform group-hover:shadow-lg h-full";
  const variantClasses = {
    primary: "bg-indigo-600 text-white shadow-xl shadow-indigo-200 group-hover:scale-[1.02] group-hover:shadow-2xl",
    secondary: "bg-white border border-slate-200 text-slate-800 group-hover:border-rose-300"
  };

  const iconContainerClasses = {
    primary: "p-3 bg-white/20 rounded-2xl backdrop-blur-sm",
    secondary: "p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-100 transition-colors"
  };

  return (
    <Link href={href} className="group">
      <div className={`${baseClasses} ${variantClasses[variant]}`}>
        <div className="flex justify-between items-start mb-6">
          <div className={iconContainerClasses[variant]}>{icon}</div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded ${variant === 'primary' ? 'bg-white/20 text-indigo-50' : 'bg-rose-50 text-rose-600'}`}>{tag}</span>
        </div>
        <h3 className="text-xl font-bold mb-1">{title}</h3>
        <p className={variant === 'primary' ? 'text-indigo-200 text-sm' : 'text-slate-400 text-sm'}>{description}</p>
      </div>
    </Link>
  );
}