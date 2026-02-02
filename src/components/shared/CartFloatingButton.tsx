'use client';

import { ShoppingCart } from 'lucide-react';

interface CartFloatingButtonProps {
  itemCount: number;
  onClick: () => void;
  label?: string;
}

export const CartFloatingButton = ({
  itemCount,
  onClick,
  label = 'View Queue',
}: CartFloatingButtonProps) => {
  if (itemCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 animate-in slide-in-from-bottom-10 fade-in"
    >
      <div className="relative">
        <ShoppingCart size={24} />
        <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-indigo-600">
          {itemCount}
        </span>
      </div>
      <span className="font-bold pr-2">{label}</span>
    </button>
  );
};
