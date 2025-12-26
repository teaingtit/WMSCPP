import type { Metadata } from 'next';
import { Inter, Sarabun } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sarabun = Sarabun({ 
  weight: ['300', '400', '500', '600', '700'], 
  subsets: ['thai', 'latin'], 
  variable: '--font-sarabun' 
});

export const metadata: Metadata = {
  title: 'WMS Pro - Stable Edition',
  description: 'Warehouse Management System v.01',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={cn("min-h-screen bg-slate-50 font-sans antialiased", inter.variable, sarabun.variable)}>
        {children}
      </body>
    </html>
  );
}