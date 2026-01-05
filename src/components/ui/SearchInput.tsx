// components/ui/SearchInput.tsx
'use client';

import { Search } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce'; // *ถ้าไม่ได้ลง use-debounce ให้ใช้ setTimeout แบบ Manual แทนได้ (ดูโค้ดด้านล่าง)

export default function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Debounce Implementation
  const handleSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams);

    // ตั้งค่า Page กลับเป็น 1 เสมอเมื่อเริ่มค้นหาใหม่
    params.set('page', '1');

    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }

    // Update URL โดยไม่ Refresh หน้า
    replace(`${pathname}?${params.toString()}`);
  }, 500);

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-xl border border-slate-200 bg-white py-[9px] pl-10 text-sm outline-2 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        placeholder={placeholder}
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        // อ่านค่าจาก URL มาแสดง (เพื่อให้ Refresh แล้วค่าไม่หาย)
        defaultValue={searchParams.get('q')?.toString()}
      />
      <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 peer-focus:text-indigo-600" />
    </div>
  );
}
