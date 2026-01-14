import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SkeletonList from '../SkeletonList';

describe('SkeletonList', () => {
  it('should render default number of skeleton items', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('.animate-pulse');

    // SkeletonList มี 5 items โดย default และแต่ละ item มี skeleton elements
    expect(items.length).toBeGreaterThan(0);
  });

  it('should render custom count of items', () => {
    const { container } = render(<SkeletonList count={3} />);
    const items = container.querySelectorAll('.rounded-2xl');

    expect(items).toHaveLength(3);
  });

  it('should apply custom item height', () => {
    const { container } = render(<SkeletonList itemHeight={100} />);
    const item = container.querySelector('.rounded-2xl');

    expect(item).toHaveStyle({ height: '100px' });
  });

  it('should apply custom spacing', () => {
    const { container } = render(<SkeletonList spacing={20} />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveStyle({ gap: '20px' });
  });

  it('should render avatar skeleton', () => {
    const { container } = render(<SkeletonList />);
    const avatar = container.querySelector('.rounded-full');

    expect(avatar).toBeInTheDocument();
  });

  it('should render text skeletons', () => {
    const { container } = render(<SkeletonList />);
    const textSkeletons = container.querySelectorAll('.animate-pulse');

    // แต่ละ item ควรมี text skeletons
    expect(textSkeletons.length).toBeGreaterThan(0);
  });
});
