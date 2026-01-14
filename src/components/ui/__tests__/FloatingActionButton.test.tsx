import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import FloatingActionButton from '../FloatingActionButton';
import { Plus } from 'lucide-react';

describe('FloatingActionButton', () => {
  it('should render with default props', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton onClick={onClick} label="Add Item" />);

    const button = screen.getByRole('button', { name: 'Add Item' });
    expect(button).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<FloatingActionButton onClick={onClick} label="Add Item" />);

    const button = screen.getByRole('button', { name: 'Add Item' });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render with custom icon', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton onClick={onClick} label="Custom" icon={Plus} />);

    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toBeInTheDocument();
  });

  it('should display badge when provided', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton onClick={onClick} label="Add" badge={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display 99+ when badge exceeds 99', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton onClick={onClick} label="Add" badge={150} />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton onClick={onClick} label="Add" disabled={true} />);

    const button = screen.getByRole('button', { name: 'Add' });
    expect(button).toBeDisabled();
  });

  it('should not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<FloatingActionButton onClick={onClick} label="Add" disabled={true} />);

    const button = screen.getByRole('button', { name: 'Add' });
    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('should apply correct variant styles', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <FloatingActionButton onClick={onClick} label="Add" variant="success" />,
    );

    let button = screen.getByRole('button', { name: 'Add' });
    expect(button.className).toContain('from-success');

    rerender(<FloatingActionButton onClick={onClick} label="Add" variant="warning" />);
    button = screen.getByRole('button', { name: 'Add' });
    expect(button.className).toContain('from-warning');
  });

  it('should have correct ARIA attributes', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton onClick={onClick} label="Add Item" disabled={false} />);

    const button = screen.getByRole('button', { name: 'Add Item' });
    expect(button).toHaveAttribute('aria-label', 'Add Item');
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });
});
