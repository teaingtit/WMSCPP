// components/ui/button.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive' | 'outline' | 'secondary' | 'link' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xl';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base Styles - Modern & Touch-friendly
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.98] select-none',

          // Variants with enhanced visual appeal
          variant === 'default' && [
            'bg-gradient-to-b from-primary to-primary/90 text-primary-foreground',
            'shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30',
            'hover:from-primary/95 hover:to-primary/85',
            'border border-primary/20',
          ],
          variant === 'destructive' && [
            'bg-gradient-to-b from-destructive to-destructive/90 text-destructive-foreground',
            'shadow-md shadow-destructive/25 hover:shadow-lg hover:shadow-destructive/30',
            'border border-destructive/20',
          ],
          variant === 'success' && [
            'bg-gradient-to-b from-success to-success/90 text-success-foreground',
            'shadow-md shadow-success/25 hover:shadow-lg hover:shadow-success/30',
            'border border-success/20',
          ],
          variant === 'outline' && [
            'border-2 border-input bg-background/50 backdrop-blur-sm',
            'shadow-sm hover:shadow-md',
            'hover:bg-accent hover:text-accent-foreground hover:border-accent',
          ],
          variant === 'secondary' && [
            'bg-secondary text-secondary-foreground',
            'shadow-sm hover:shadow-md',
            'hover:bg-secondary/80',
          ],
          variant === 'ghost' && [
            'hover:bg-accent hover:text-accent-foreground',
            'hover:shadow-sm',
          ],
          variant === 'link' && [
            'text-primary underline-offset-4',
            'hover:underline hover:text-primary/80',
          ],

          // Sizes - Optimized for touch and accessibility
          size === 'default' && 'h-11 px-5 py-2.5',
          size === 'sm' && 'h-9 rounded-lg px-3.5 text-xs',
          size === 'lg' && 'h-12 rounded-xl px-8 text-base',
          size === 'xl' && 'h-14 rounded-2xl px-8 text-lg w-full font-bold', // Mobile CTA
          size === 'icon' && 'h-11 w-11 p-0',

          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
