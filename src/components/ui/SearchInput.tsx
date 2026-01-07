// components/ui/SearchInput.tsx
'use client';

import { Search, X } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ placeholder = 'Search...', className }: SearchInputProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const currentValue = searchParams.get('q')?.toString() || '';

  // Debounce Implementation
  const handleSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams);

    // Reset page to 1 when searching
    params.set('page', '1');

    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }

    // Update URL without refresh
    replace(`${pathname}?${params.toString()}`);
  }, 400);

  const clearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      handleSearch('');
      inputRef.current.focus();
    }
  };

  return (
    <div className={cn('relative flex flex-1', className)}>
      <label htmlFor="search" className="sr-only">
        Search
      </label>

      {/* Search Icon */}
      <div
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200',
          isFocused ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <Search size={18} />
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        id="search"
        type="text"
        className={cn(
          // Base styles
          'w-full h-12 pl-11 pr-10 rounded-xl',
          'bg-white/5 border border-white/10',
          'text-white placeholder:text-slate-500',
          'text-sm font-medium',

          // Focus states
          'outline-none transition-all duration-200',
          'focus:bg-white/10 focus:border-primary/50',
          'focus:ring-2 focus:ring-primary/20',

          // Hover
          'hover:bg-white/[0.07] hover:border-white/20',
        )}
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        defaultValue={currentValue}
      />

      {/* Clear Button */}
      {currentValue && (
        <button
          type="button"
          onClick={clearSearch}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            'p-1 rounded-lg',
            'text-slate-400 hover:text-white',
            'hover:bg-white/10 transition-all duration-200',
            'active:scale-95',
          )}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
