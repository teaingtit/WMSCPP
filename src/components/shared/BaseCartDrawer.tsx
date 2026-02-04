'use client';

import React from 'react';
import { X, Package } from 'lucide-react';

interface BaseCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  itemCount: number;
  children: React.ReactNode; // The list of items
  footer?: React.ReactNode; // The action buttons
  onClearAll?: () => void;
}

export const BaseCartDrawer = ({
  isOpen,
  onClose,
  title,
  icon,
  itemCount,
  children,
  footer,
  onClearAll,
}: BaseCartDrawerProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel - Account for bottom nav height on mobile */}
      <div className="relative w-full max-w-md bg-card shadow-2xl flex flex-col h-full pb-16 lg:pb-0 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md">
              {icon || <Package size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground">{itemCount} items selected</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onClearAll && itemCount > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-rose-500 font-bold hover:underline mr-2"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close cart"
              className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content - List of Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {itemCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Package size={48} className="opacity-20" />
              <p>No items in queue</p>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer Actions */}
        {footer && (
          <div className="p-4 bg-card border-t border-border pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
