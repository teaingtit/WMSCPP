// components/SubmitButton.tsx
'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

export function SubmitButton({ 
  children, 
  className 
}: { 
  children: React.ReactNode, 
  className?: string 
}) {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending}
      className={`${className} disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      {pending ? <Loader2 className="animate-spin mr-2" /> : null}
      {children}
    </button>
  );
}