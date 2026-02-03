'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeContext } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

const themeOptions = [
  { value: 'light' as const, label: 'สว่าง', icon: Sun },
  { value: 'dark' as const, label: 'มืด', icon: Moon },
  { value: 'system' as const, label: 'ตามระบบ', icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, mounted } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className="p-2.5 rounded-xl text-slate-300 hover:bg-white/5 transition-all"
        aria-label="Theme"
      >
        <Sun size={20} />
      </button>
    );
  }

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2.5 rounded-xl transition-all duration-200 active:scale-95',
          'text-slate-300 hover:text-white hover:bg-white/10',
        )}
        aria-label="เปลี่ยนธีม"
        title="เปลี่ยนธีม"
      >
        <CurrentIcon size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-xl p-1.5 z-50 animate-scale-in">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent',
                )}
              >
                <Icon size={16} />
                <span>{option.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact version for mobile nav
export function ThemeToggleCompact() {
  const { resolvedTheme, toggleTheme, mounted } = useThemeContext();

  if (!mounted) {
    return null;
  }

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-lg transition-all duration-200 active:scale-95',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
      aria-label={resolvedTheme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
    >
      <Icon size={20} />
    </button>
  );
}
