// components/ui/button.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive' | 'outline' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xl'; // Added xl for mobile primary actions
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base Styles
          'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',

          // Variants
          variant === 'default' &&
            'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg shadow-primary/20',
          variant === 'destructive' &&
            'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
          variant === 'outline' &&
            'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
          variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
          variant === 'link' && 'text-primary underline-offset-4 hover:underline',

          // Sizes
          size === 'default' && 'h-11 px-4 py-2', // Increased height for better touch
          size === 'sm' && 'h-9 rounded-lg px-3 text-xs',
          size === 'lg' && 'h-12 rounded-xl px-8 text-base',
          size === 'xl' && 'h-14 rounded-2xl px-8 text-lg w-full', // Mobile heavy action
          size === 'icon' && 'h-11 w-11', // Larger icon button

          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
