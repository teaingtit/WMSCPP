import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkeletonLoader from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('should render single skeleton with default variant', () => {
    const { container } = render(<SkeletonLoader />);
    const skeleton = container.querySelector('.animate-pulse');

    expect(skeleton).toBeInTheDocument();
  });

  it('should render multiple skeletons when count is provided', () => {
    const { container } = render(<SkeletonLoader count={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');

    expect(skeletons).toHaveLength(3);
  });

  it('should apply correct styles for text variant', () => {
    const { container } = render(<SkeletonLoader variant="text" />);
    const skeleton = container.querySelector('.h-4');

    expect(skeleton).toBeInTheDocument();
  });

  it('should apply correct styles for card variant', () => {
    const { container } = render(<SkeletonLoader variant="card" />);
    const skeleton = container.querySelector('.h-32');

    expect(skeleton).toBeInTheDocument();
  });

  it('should apply correct styles for avatar variant', () => {
    const { container } = render(<SkeletonLoader variant="avatar" />);
    const skeleton = container.querySelector('.rounded-full');

    expect(skeleton).toBeInTheDocument();
  });

  it('should apply correct styles for button variant', () => {
    const { container } = render(<SkeletonLoader variant="button" />);
    const skeleton = container.querySelector('.h-10');

    expect(skeleton).toBeInTheDocument();
  });

  it('should apply correct styles for input variant', () => {
    const { container } = render(<SkeletonLoader variant="input" />);
    const skeleton = container.querySelector('.h-12');

    expect(skeleton).toBeInTheDocument();
  });

  it('should apply custom width', () => {
    const { container } = render(<SkeletonLoader width="200px" />);
    const wrapper = container.firstChild as HTMLElement;
    const skeleton = container.querySelector('.animate-pulse');

    expect(wrapper?.style.getPropertyValue('--skeleton-width')).toBe('200px');
    expect(skeleton).toHaveClass('skeleton-size-dynamic');
  });

  it('should apply custom height', () => {
    const { container } = render(<SkeletonLoader height="50px" />);
    const wrapper = container.firstChild as HTMLElement;
    const skeleton = container.querySelector('.animate-pulse');

    expect(wrapper?.style.getPropertyValue('--skeleton-height')).toBe('50px');
    expect(skeleton).toHaveClass('skeleton-size-dynamic');
  });

  it('should apply custom className', () => {
    const { container } = render(<SkeletonLoader className="custom-class" />);
    const skeleton = container.querySelector('.custom-class');

    expect(skeleton).toBeInTheDocument();
  });

  it('should have shimmer effect', () => {
    const { container } = render(<SkeletonLoader />);
    const shimmer = container.querySelector('.animate-shimmer');

    expect(shimmer).toBeInTheDocument();
  });
});
