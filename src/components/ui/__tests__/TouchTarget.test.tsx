import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TouchTarget from '../TouchTarget';

describe('TouchTarget', () => {
  it('should render children', () => {
    render(
      <TouchTarget>
        <span>Click me</span>
      </TouchTarget>,
    );

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply default size (48px)', () => {
    const { container } = render(
      <TouchTarget>
        <span>Content</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('min-w-[48px]');
    expect(wrapper.className).toContain('min-h-[48px]');
  });

  it('should apply custom size (44px)', () => {
    const { container } = render(
      <TouchTarget size={44}>
        <span>Content</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('min-w-[44px]');
    expect(wrapper.className).toContain('min-h-[44px]');
  });

  it('should apply custom size (56px)', () => {
    const { container } = render(
      <TouchTarget size={56}>
        <span>Content</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('min-w-[56px]');
    expect(wrapper.className).toContain('min-h-[56px]');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <TouchTarget onClick={onClick}>
        <span>Click me</span>
      </TouchTarget>,
    );

    await user.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should have correct ARIA label', () => {
    const { container } = render(
      <TouchTarget ariaLabel="Custom action">
        <span>Icon</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-label', 'Custom action');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <TouchTarget className="custom-class">
        <span>Content</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('should have touch-manipulation class', () => {
    const { container } = render(
      <TouchTarget>
        <span>Content</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('touch-manipulation');
  });
});
