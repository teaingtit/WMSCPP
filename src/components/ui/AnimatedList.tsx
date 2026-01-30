'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedListProps {
  children: React.ReactNode;
  staggerDelay?: number; // milliseconds
  className?: string;
}

/**
 * AnimatedList: Applies stagger fade-in animation to child elements
 *
 * Usage:
 * ```tsx
 * <AnimatedList staggerDelay={60}>
 *   {items.map((item) => (
 *     <Card key={item.id} {...item} />
 *   ))}
 * </AnimatedList>
 * ```
 */
export default function AnimatedList({
  children,
  staggerDelay = 50,
  className,
}: AnimatedListProps) {
  const childArray = React.Children.toArray(children);

  return (
    <div className={cn('space-y-3', className)}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className="animate-fade-in-up stagger-item"
          ref={(el) => {
            if (el) el.style.setProperty('--stagger-delay', `${index * staggerDelay}ms`);
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
