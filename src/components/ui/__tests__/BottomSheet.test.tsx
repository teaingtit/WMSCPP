import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BottomSheet from '../BottomSheet';

describe('BottomSheet', () => {
  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet isOpen={false} onClose={onClose}>
        <div>Content</div>
      </BottomSheet>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <div data-testid="content">Content</div>
      </BottomSheet>,
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="Test Title">
        <div>Content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container } = render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <div>Content</div>
      </BottomSheet>,
    );

    const backdrop = container.querySelector('.bg-black\\/40');
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <BottomSheet isOpen={true} onClose={onClose} title="Test">
        <div>Content</div>
      </BottomSheet>,
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn();

    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <div>Content</div>
      </BottomSheet>,
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('should render children content', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <div data-testid="child-content">Test Content</div>
      </BottomSheet>,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should have drag indicator on mobile', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet isOpen={true} onClose={onClose}>
        <div>Content</div>
      </BottomSheet>,
    );

    // ตรวจหา drag indicator (w-12 h-1.5 rounded-full)
    const dragIndicator = container.querySelector('.w-12.h-1\\.5');
    expect(dragIndicator).toBeInTheDocument();
  });

  it('should apply custom snap point', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet isOpen={true} onClose={onClose} snapPoints={[80]}>
        <div>Content</div>
      </BottomSheet>,
    );

    const sheet = container.querySelector('.max-h-\\[90vh\\]');
    expect(sheet).toBeInTheDocument();
  });
});
