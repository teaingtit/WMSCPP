'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { type ComponentPropsWithoutRef } from 'react';

type SubmitButtonProps = ComponentPropsWithoutRef<'button'> & {
  children: React.ReactNode;
};

export function SubmitButton({ children, className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={`relative disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <span className={pending ? 'opacity-0' : 'opacity-100 transition-opacity'}>{children}</span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </span>
      )}
    </button>
  );
}
