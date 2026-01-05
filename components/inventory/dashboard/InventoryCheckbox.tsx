'use client';

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface Props {
  checked: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export const InventoryCheckbox = ({ checked, onClick, className = '' }: Props) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    className={`cursor-pointer transition-colors ${className}`}
  >
    {checked ? (
      <CheckSquare className="text-indigo-600" size={20} />
    ) : (
      <Square className="text-slate-300" size={20} />
    )}
  </div>
);
