'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

type AsyncSelectProps<T> = {
  fetcher: (q: string) => Promise<T[]>;
  value: T | null;
  onChange: (v: T | null) => void;
  getLabel?: (v: T) => string;
  placeholder?: string;
  debounceMs?: number;
};

export default function AsyncSelect<T extends any>({
  fetcher,
  value,
  onChange,
  getLabel,
  placeholder,
  debounceMs = 300,
}: AsyncSelectProps<T>) {
  const [term, setTerm] = useState('');
  const [debounced] = useDebounce(term, debounceMs);
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!debounced) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await fetcher(debounced);
        if (!mounted) return;
        setOptions(res || []);
      } catch (err) {
        console.error('AsyncSelect fetch error', err);
        setOptions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debounced, fetcher]);

  return (
    <div className="relative">
      <input
        value={value ? (getLabel ? getLabel(value) : String(value)) : term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 min-h-[48px] border border-slate-200 rounded-xl
                   text-base bg-white
                   focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none
                   transition-all duration-200"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-slate-500">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
          <span className="hidden sm:inline">กำลังโหลด...</span>
        </div>
      )}

      {options.length > 0 && (
        <div className="absolute z-20 left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 max-h-60 overflow-y-auto shadow-xl">
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={() => {
                onChange(opt);
                setTerm('');
                setOptions([]);
              }}
              className="px-4 py-3 min-h-[48px] flex items-center
                         hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-sm
                         transition-colors touch-manipulation
                         first:rounded-t-xl last:rounded-b-xl"
            >
              {getLabel ? getLabel(opt) : String(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
