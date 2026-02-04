import React from 'react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-background text-foreground p-6 md:p-8">{children}</div>;
}
