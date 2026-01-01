// components/ui/button.tsx
import * as React from "react"
import { cn } from "@/lib/utils/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base Styles
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50",
          
          // Variants
          variant === 'default' && "bg-indigo-600 text-white shadow hover:bg-indigo-700",
          variant === 'destructive' && "bg-red-500 text-white shadow-sm hover:bg-red-600",
          variant === 'outline' && "border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900",
          variant === 'ghost' && "hover:bg-slate-100 hover:text-slate-900",
          
          // Sizes
          size === 'default' && "h-9 px-4 py-2",
          size === 'sm' && "h-8 rounded-md px-3 text-xs",
          size === 'lg' && "h-10 rounded-md px-8",
          size === 'icon' && "h-9 w-9",
          
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }