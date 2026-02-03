'use client';

import { X, Keyboard } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ShortcutConfig } from '@/hooks/useGlobalShortcuts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutConfig[];
}

const categoryLabels: Record<string, string> = {
  navigation: 'การนำทาง',
  action: 'การดำเนินการ',
  modal: 'หน้าต่าง',
};

export default function ShortcutsHelpModal({ isOpen, onClose, shortcuts }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category]!.push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className={cn(
          'w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl',
          'animate-scale-in outline-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Keyboard size={22} />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-lg font-bold text-foreground">
                คีย์ลัด
              </h2>
              <p className="text-sm text-muted-foreground">Keyboard Shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <span className="text-sm font-medium text-foreground">
                          {shortcut.descriptionTh}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({shortcut.description})
                        </span>
                      </div>
                      <KeyBadge keys={shortcut.key} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 rounded-b-2xl">
          <p className="text-xs text-muted-foreground text-center">
            กด <KeyBadge keys="?" className="inline-flex mx-1" /> เพื่อเปิด/ปิดหน้าต่างนี้
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper component for rendering key badges
function KeyBadge({ keys, className }: { keys: string; className?: string }) {
  const keyParts = keys.split(' ');

  return (
    <span className={cn('flex items-center gap-1', className)}>
      {keyParts.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          <kbd
            className={cn(
              'px-2 py-1 text-xs font-mono font-semibold rounded-md',
              'bg-background border border-border shadow-sm',
              'text-foreground',
            )}
          >
            {formatKeyDisplay(key)}
          </kbd>
          {index < keyParts.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
        </span>
      ))}
    </span>
  );
}

function formatKeyDisplay(key: string): string {
  const keyMap: Record<string, string> = {
    Escape: 'Esc',
    '/': '/',
    '?': '?',
  };
  return keyMap[key] || key.toUpperCase();
}
