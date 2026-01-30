// @ts-nocheck
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js navigation to prevent errors in tests
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    const error: any = new Error('NEXT_REDIRECT');
    error.digest = 'NEXT_REDIRECT';
    throw error;
  }),
}));

// Mock Next.js cache (revalidatePath is from next/cache, not next/navigation)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(() => {
    // Mock implementation that doesn't throw
  }),
}));
