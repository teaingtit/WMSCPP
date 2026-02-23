'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Search, Calendar, X, Loader2 } from 'lucide-react';

export default function HistoryFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial State from URL
  const initialSearch = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'ALL';
  const initialMode = searchParams.get('mode') || 'simple';
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';

  const [text, setText] = useState(initialSearch);
  const [query] = useDebounce(text, 400);
  const [type, setType] = useState(initialType);
  const [mode, setMode] = useState(initialMode);
  const [showDateFilter, setShowDateFilter] = useState(!!initialStartDate);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isPending, startTransition] = useTransition();

  // Update URL on Debounced Search or Filter Change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    if (query) params.set('q', query);
    else params.delete('q');

    if (type && type !== 'ALL') params.set('type', type);
    else params.delete('type');

    if (mode) params.set('mode', mode);

    if (startDate) params.set('startDate', startDate);
    else params.delete('startDate');

    if (endDate) params.set('endDate', endDate);
    else params.delete('endDate');

    // Reset pagination if implemented later
    // params.set('page', '1');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [query, type, mode, startDate, endDate, pathname, router, searchParams]);

  return (
    <div className="flex flex-col gap-4 bg-card p-4 rounded-xl shadow-sm border border-border mb-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        {/* Left: Search & Type */}
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder="Search SKU, Product, User, Details..."
              value={text}
              disabled={isPending}
              onChange={(e) => setText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
            {isPending ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
              </div>
            ) : (
              text && (
                <button
                  onClick={() => setText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )
            )}
          </div>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-border text-sm bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            aria-label="Filter by transaction type"
            title="Filter by transaction type"
          >
            <option value="ALL">ทุกประเภท (All Types)</option>
            <optgroup label="รายการ (Transactions)">
              <option value="INBOUND">รับเข้า (Inbound)</option>
              <option value="OUTBOUND">เบิกจ่าย (Outbound)</option>
              <option value="TRANSFER">ย้ายสินค้า (Transfer)</option>
              <option value="ADJUST">ปรับยอด (Adjustment)</option>
            </optgroup>
            {mode === 'detailed' && (
              <optgroup label="ระบบ (System)">
                <option value="STATUS_CHANGE">เปลี่ยนสถานะ (Status Changes)</option>
              </optgroup>
            )}
          </select>

          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
              showDateFilter || startDate
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                : 'bg-card border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            <Calendar size={16} />
            <span className="hidden sm:inline">วันที่</span>
          </button>
        </div>

        {/* Right: Mode Toggle */}
        <div className="flex items-center bg-muted p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setMode('simple')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'simple'
                ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setMode('detailed')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'detailed'
                ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Detailed / Terminal
          </button>
        </div>
      </div>

      {/* Expandable Date Filter */}
      {showDateFilter && (
        <div className="flex items-center gap-4 pt-2 border-t border-border animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">From:</span>
            <input
              type="date"
              value={startDate}
              disabled={isPending}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs disabled:opacity-50"
              aria-label="Start date"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">To:</span>
            <input
              type="date"
              value={endDate}
              disabled={isPending}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs disabled:opacity-50"
              aria-label="End date"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-500 hover:underline ml-auto"
            >
              Clear Dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
