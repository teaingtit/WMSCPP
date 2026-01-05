import React from 'react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-slate-50 text-slate-900 p-6 md:p-8">
        {children}
    </div>
  );
}
