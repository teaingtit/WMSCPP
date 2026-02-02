'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileQuestion, Package } from 'lucide-react';

export default function WarehouseNotFound() {
  const params = useParams();
  const warehouseId = params?.['warehouseId'] as string;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="bg-white/5 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 max-w-md w-full">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileQuestion size={32} />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Section Not Found</h2>
        <p className="text-slate-500 dark:text-slate-500 mb-8 text-sm">
          This section of the warehouse does not exist.
        </p>

        <Link
          href={`/dashboard/${warehouseId}/inventory`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm"
        >
          <Package size={18} />
          Back to Inventory
        </Link>
      </div>
    </div>
  );
}
