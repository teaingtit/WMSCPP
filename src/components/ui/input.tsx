import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
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
          !error && 'border-input',

          // Error state
          error &&
            'border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive',

          // Shadow for depth
          'shadow-sm hover:shadow-md focus:shadow-md',

          className,
        )}
        ref={ref}
        {...props}
      />
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
