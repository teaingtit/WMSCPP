'use client';

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface Props {
  checked: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

const buttonClass = `
  min-w-[44px] min-h-[44px]
  flex items-center justify-center
  rounded-lg
  cursor-pointer
  transition-all duration-200
  active:scale-95
  touch-manipulation
  hover:bg-slate-100
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
`;

export const InventoryCheckbox = ({ checked, onClick, className = '' }: Props) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    className={`${buttonClass}${className}`}
    aria-label={checked ? 'ยกเลิกการเลือก' : 'เลือกรายการ'}
    {...(checked ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
  >
    {checked ? (
      <CheckSquare className="text-indigo-600" size={24} />
    ) : (
      <Square className="text-slate-500 group-hover:text-slate-500" size={24} />
    )}
  </button>
);
