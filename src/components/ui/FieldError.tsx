import { AlertCircle } from 'lucide-react';

export interface FieldErrorProps {
  id: string;
  message?: string | undefined;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive mt-1 flex items-center gap-1" role="alert">
      <AlertCircle size={14} aria-hidden />
      {message}
    </p>
  );
}
