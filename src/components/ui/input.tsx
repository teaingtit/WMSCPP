import * as React from 'react';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/ui/FieldError';

export interface InputProps extends React.ComponentProps<'input'> {
  error?: boolean;
  errorMessage?: string | undefined;
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling';
  'aria-describedby'?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      errorMessage,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedErrorId = React.useId();
    const errorId = id ? `${id}-error` : `${generatedErrorId}-error`;
    const hasError = error ?? !!errorMessage;
    const invalidValue = hasError ? true : ariaInvalid ?? false;
    const describedBy = errorMessage ? errorId : ariaDescribedBy;

    return (
      <div className="w-full">
        <input
          type={type}
          id={id}
          aria-invalid={invalidValue ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={cn(
            // Base styles - Touch-optimized
            'flex h-12 w-full rounded-xl border bg-background px-4 py-3',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'transition-all duration-200',

            // Focus states
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',

            // File input
            'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',

            // Disabled state
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50',

            // Default border
            !hasError && 'border-input',

            // Error state
            hasError &&
              'border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive',

            // Shadow for depth
            'shadow-sm hover:shadow-md focus:shadow-md',

            className,
          )}
          ref={ref}
          {...props}
        />
        <FieldError id={errorId} message={errorMessage} />
      </div>
    );
  },
);
Input.displayName = 'Input';

// New: Search Input variant with icon support
const SearchInput = React.forwardRef<HTMLInputElement, InputProps & { icon?: React.ReactNode }>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <Input ref={ref} className={cn(icon && 'pl-11', className)} {...props} />
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';

export { Input, SearchInput };
