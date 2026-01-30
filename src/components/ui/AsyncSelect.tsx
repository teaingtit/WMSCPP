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
        className="w-full p-2 border rounded-md"
      />

      {loading && <div className="absolute right-2 top-2 text-xs text-slate-500">กำลังโหลด...</div>}

      {options.length > 0 && (
        <div className="absolute z-20 left-0 right-0 bg-white border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={() => {
                onChange(opt);
                setTerm('');
                setOptions([]);
              }}
              className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
            >
              {getLabel ? getLabel(opt) : String(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
