// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { triggerFeedback, useHapticFeedback, useFeedbackRef } from '@/lib/haptics';

describe('haptics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('triggerFeedback', () => {
    it('should do nothing when element is null', () => {
      expect(() => triggerFeedback(null)).not.toThrow();
    });

    it('should add pulse class for type pulse', () => {
      const el = document.createElement('div');
      triggerFeedback(el, 'pulse');
      expect(el.classList.contains('animate-pulse-once')).toBe(true);
      vi.advanceTimersByTime(500);
      expect(el.classList.contains('animate-pulse-once')).toBe(false);
    });

    it('should add shake class for type shake', () => {
      const el = document.createElement('div');
      triggerFeedback(el, 'shake');
      expect(el.classList.contains('animate-shake')).toBe(true);
      vi.advanceTimersByTime(400);
      expect(el.classList.contains('animate-shake')).toBe(false);
    });

    it('should add flash-success class for type success', () => {
      const el = document.createElement('div');
      triggerFeedback(el, 'success');
      expect(el.classList.contains('flash-success')).toBe(true);
      vi.advanceTimersByTime(600);
      expect(el.classList.contains('flash-success')).toBe(false);
    });

    it('should add flash-error class for type error', () => {
      const el = document.createElement('div');
      triggerFeedback(el, 'error');
      expect(el.classList.contains('flash-error')).toBe(true);
      vi.advanceTimersByTime(600);
      expect(el.classList.contains('flash-error')).toBe(false);
    });

    it('should add bounce class for type bounce', () => {
      const el = document.createElement('div');
      triggerFeedback(el, 'bounce');
      expect(el.classList.contains('animate-bounce-soft')).toBe(true);
      vi.advanceTimersByTime(1000);
      expect(el.classList.contains('animate-bounce-soft')).toBe(false);
    });

    it('should default to pulse when type not provided', () => {
      const el = document.createElement('div');
      triggerFeedback(el);
      expect(el.classList.contains('animate-pulse-once')).toBe(true);
    });
  });

  describe('useHapticFeedback', () => {
    it('should return pulse, shake, success, error handlers', () => {
      const { result } = renderHook(() => useHapticFeedback());
      expect(typeof result.current.pulse).toBe('function');
      expect(typeof result.current.shake).toBe('function');
      expect(typeof result.current.success).toBe('function');
      expect(typeof result.current.error).toBe('function');
    });

    it('should call triggerFeedback with correct type when pulse is invoked', () => {
      const el = document.createElement('div');
      const { result } = renderHook(() => useHapticFeedback());
      result.current.pulse({ currentTarget: el } as React.MouseEvent<HTMLElement>);
      expect(el.classList.contains('animate-pulse-once')).toBe(true);
    });
  });

  describe('useFeedbackRef', () => {
    it('should return trigger function that returns a function', () => {
      const { result } = renderHook(() => useFeedbackRef());
      const triggerPulse = result.current.trigger('pulse');
      expect(typeof triggerPulse).toBe('function');
    });

    it('should apply feedback when trigger result is called with element', () => {
      const el = document.createElement('div');
      const { result } = renderHook(() => useFeedbackRef());
      result.current.trigger('shake')(el);
      expect(el.classList.contains('animate-shake')).toBe(true);
    });
  });
});
