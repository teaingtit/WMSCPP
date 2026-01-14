// components/ui/PaginationControls.tsx
'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function PaginationControls({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      {/* ปุ่ม Prev */}
      {currentPage > 1 ? (
        <Link
          href={createPageURL(currentPage - 1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-indigo-300 transition-all"
        >
          <ArrowLeft size={16} /> ก่อนหน้า
        </Link>
      ) : (
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-300 bg-slate-50 border border-slate-100 rounded-lg cursor-not-allowed"
        >
          <ArrowLeft size={16} /> ก่อนหน้า
        </button>
      )}

      <span className="text-sm font-medium text-slate-500">
        หน้า <span className="text-indigo-600 font-bold">{currentPage}</span> จาก {totalPages}
      </span>

      {/* ปุ่ม Next */}
      {currentPage < totalPages ? (
        <Link
          href={createPageURL(currentPage + 1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-indigo-300 transition-all"
        >
          ถัดไป <ArrowRight size={16} />
        </Link>
      ) : (
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-300 bg-slate-50 border border-slate-100 rounded-lg cursor-not-allowed"
        >
          ถัดไป <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
