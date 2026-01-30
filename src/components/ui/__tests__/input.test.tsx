import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Input, SearchInput } from '../input';
import { Search } from 'lucide-react';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('applies validation error styles when error prop is true', () => {
    render(<Input error placeholder="Error input" />);
    const input = screen.getByPlaceholderText('Error input');
    expect(input).toHaveClass('border-destructive');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles disabled state', () => {
    render(<Input disabled placeholder="Disabled input" />);
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  it('applies custom className', () => {
    render(<Input className="custom-input-class" placeholder="Custom" />);
    const input = screen.getByPlaceholderText('Custom');
    expect(input).toHaveClass('custom-input-class');
  });
});

describe('SearchInput', () => {
  it('renders with icon', () => {
    render(<SearchInput icon={<Search data-testid="search-icon" />} placeholder="Search..." />);
    const input = screen.getByPlaceholderText('Search...');
    const icon = screen.getByTestId('search-icon');

    expect(input).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    expect(input).toHaveClass('pl-11'); // Padding for icon
  });

  it('renders without icon', () => {
    render(<SearchInput placeholder="Search no icon" />);
    const input = screen.getByPlaceholderText('Search no icon');
    expect(input).toBeInTheDocument();
    expect(input).not.toHaveClass('pl-11');
  });
});
