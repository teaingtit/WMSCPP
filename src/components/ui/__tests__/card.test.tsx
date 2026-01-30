import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardInteractive,
} from '../card';

describe('Card', () => {
  it('renders Card with content', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders CardHeader with content', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('renders CardTitle with content', () => {
    render(<CardTitle>Title Content</CardTitle>);
    const title = screen.getByText('Title Content');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H3');
  });

  it('renders CardDescription with content', () => {
    render(<CardDescription>Description Content</CardDescription>);
    const desc = screen.getByText('Description Content');
    expect(desc).toBeInTheDocument();
    expect(desc.tagName).toBe('P');
  });

  it('renders CardContent with content', () => {
    render(<CardContent>Main Content</CardContent>);
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('renders CardFooter with content', () => {
    render(<CardFooter>Footer Content</CardFooter>);
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('applies custom classes', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CardInteractive', () => {
  it('renders with interactivity classes', () => {
    const { container } = render(<CardInteractive>Clickable</CardInteractive>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveClass('hover:shadow-lg');
  });

  it('renders content correctly', () => {
    render(<CardInteractive>Interactive Content</CardInteractive>);
    expect(screen.getByText('Interactive Content')).toBeInTheDocument();
  });
});
