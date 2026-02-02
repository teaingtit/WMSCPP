import Link from 'next/link';
import { FileQuestion, LayoutGrid } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="bg-white/5 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 max-w-md w-full">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileQuestion size={32} />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-500 mb-8 text-sm">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm"
        >
          <LayoutGrid size={18} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
