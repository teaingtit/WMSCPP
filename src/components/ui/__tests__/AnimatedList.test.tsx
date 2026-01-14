import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AnimatedList from '../AnimatedList';

describe('AnimatedList', () => {
  it('should render children', () => {
    render(
      <AnimatedList>
        <div data-testid="child-1">Item 1</div>
        <div data-testid="child-2">Item 2</div>
      </AnimatedList>,
    );

    expect(document.querySelector('[data-testid="child-1"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="child-2"]')).toBeInTheDocument();
  });

  it('should apply animation class to children', () => {
    const { container } = render(
      <AnimatedList>
        <div>Item 1</div>
        <div>Item 2</div>
      </AnimatedList>,
    );

    const animatedDivs = container.querySelectorAll('.animate-fade-in-up');
    expect(animatedDivs.length).toBeGreaterThan(0);
  });

  it('should apply stagger delay', () => {
    const { container } = render(
      <AnimatedList staggerDelay={100}>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </AnimatedList>,
    );

    const animatedDivs = container.querySelectorAll('.animate-fade-in-up');
    expect(animatedDivs).toHaveLength(3);
  });

  it('should handle empty children', () => {
    const { container } = render(<AnimatedList />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle single child', () => {
    render(
      <AnimatedList>
        <div data-testid="single-child">Only one</div>
      </AnimatedList>,
    );

    expect(document.querySelector('[data-testid="single-child"]')).toBeInTheDocument();
  });
});
