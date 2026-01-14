'use client';

import SkeletonLoader from './SkeletonLoader';

interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  spacing?: number;
}

/**
 * SkeletonList - List of skeleton items
 * Commonly used for loading inventory items, audit sessions, etc.
 */
export default function SkeletonList({
  count = 5,
  itemHeight = 80,
  spacing = 12,
}: SkeletonListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${spacing}px` }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-4 animate-pulse"
          style={{ height: `${itemHeight}px` }}
        >
          <div className="flex items-center gap-4 h-full">
            {/* Avatar/Icon */}
            <SkeletonLoader variant="avatar" className="flex-shrink-0" />

            {/* Content */}
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="text" width="60%" />
              <SkeletonLoader variant="text" width="80%" />
            </div>

            {/* Action */}
            <SkeletonLoader variant="button" className="flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
