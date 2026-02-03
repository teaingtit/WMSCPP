import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RATE_LIMITS,
  checkRateLimit,
  enforceRateLimit,
  withRateLimit,
  type RateLimitType,
} from '@/lib/rate-limit';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('rate-limit', () => {
  let mockRpc: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRpc = vi.fn();
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);
  });

  describe('RATE_LIMITS', () => {
    it('defines expected action types with maxRequests and windowSeconds', () => {
      const types: RateLimitType[] = [
        'BULK_IMPORT',
        'BULK_OUTBOUND',
        'TRANSACTION',
        'SEARCH',
        'REPORT',
      ];
      types.forEach((type) => {
        expect(RATE_LIMITS[type]).toBeDefined();
        expect(RATE_LIMITS[type].maxRequests).toBeGreaterThan(0);
        expect(RATE_LIMITS[type].windowSeconds).toBeGreaterThan(0);
      });
    });
  });

  describe('checkRateLimit', () => {
    it('returns allowed and metadata when RPC returns allowed', async () => {
      mockRpc.mockResolvedValue({
        data: {
          allowed: true,
          remaining: 4,
          reset_at: '2024-01-01T00:01:00Z',
          retry_after: null,
        },
        error: null,
      });

      const result = await checkRateLimit('BULK_IMPORT', 'user-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBe('2024-01-01T00:01:00Z');
      expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
        p_key: 'bulk_import:user-123',
        p_max_requests: RATE_LIMITS.BULK_IMPORT.maxRequests,
        p_window_seconds: RATE_LIMITS.BULK_IMPORT.windowSeconds,
      });
    });

    it('returns not allowed when RPC says so', async () => {
      mockRpc.mockResolvedValue({
        data: {
          allowed: false,
          remaining: 0,
          reset_at: '2024-01-01T00:01:00Z',
          retry_after: 45,
        },
        error: null,
      });

      const result = await checkRateLimit('BULK_IMPORT', 'user-123');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(45);
    });

    it('fails open (allows) when RPC returns error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('DB error') });

      const result = await checkRateLimit('BULK_IMPORT', 'user-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.BULK_IMPORT.maxRequests);
    });

    it('fails open when RPC throws', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await checkRateLimit('SEARCH', 'user-456');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.SEARCH.maxRequests);
    });
  });

  describe('enforceRateLimit', () => {
    it('returns null when rate limit allows', async () => {
      mockRpc.mockResolvedValue({
        data: {
          allowed: true,
          remaining: 1,
          reset_at: new Date().toISOString(),
          retry_after: null,
        },
        error: null,
      });

      const result = await enforceRateLimit('TRANSACTION', 'user-1');

      expect(result).toBe(null);
    });

    it('returns error response when rate limit exceeded', async () => {
      mockRpc.mockResolvedValue({
        data: {
          allowed: false,
          remaining: 0,
          reset_at: new Date().toISOString(),
          retry_after: 30,
        },
        error: null,
      });

      const result = await enforceRateLimit('BULK_IMPORT', 'user-1');

      expect(result).not.toBe(null);
      expect(result!.success).toBe(false);
      expect(result!.message).toContain('30');
      expect(result!.message).toContain('วินาที');
    });
  });

  describe('withRateLimit', () => {
    it('calls handler when allowed', async () => {
      mockRpc.mockResolvedValue({
        data: {
          allowed: true,
          remaining: 1,
          reset_at: new Date().toISOString(),
          retry_after: null,
        },
        error: null,
      });

      const handler = vi.fn().mockResolvedValue({ success: true, data: { id: '1' } });
      const wrapped = withRateLimit('REPORT', (d: { userId: string }) => d.userId, handler);

      const out = await wrapped({ userId: 'u1' });

      expect(handler).toHaveBeenCalledWith({ userId: 'u1' });
      expect(out.success).toBe(true);
      expect((out as any).data?.id).toBe('1');
    });

    it('returns rate limit message when not allowed', async () => {
      mockRpc.mockResolvedValue({
        data: {
          allowed: false,
          remaining: 0,
          reset_at: new Date().toISOString(),
          retry_after: 60,
        },
        error: null,
      });

      const handler = vi.fn();
      const wrapped = withRateLimit('BULK_OUTBOUND', () => 'u1', handler);

      const out = await wrapped({});

      expect(handler).not.toHaveBeenCalled();
      expect(out.success).toBe(false);
      expect(out.message).toContain('คำขอถูกจำกัด');
    });
  });
});
