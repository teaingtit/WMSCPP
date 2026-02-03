/**
 * Rate Limiting Utilities
 * Provides rate limiting for server actions using Supabase
 */

import { createClient } from '@/lib/supabase/server';
import { ActionResponse } from '@/types/action-response';

// Rate limit configurations
export const RATE_LIMITS = {
  // Bulk imports: 5 requests per minute
  BULK_IMPORT: { maxRequests: 5, windowSeconds: 60 },
  // Bulk outbound: 5 requests per minute
  BULK_OUTBOUND: { maxRequests: 5, windowSeconds: 60 },
  // Regular transactions: 30 requests per minute
  TRANSACTION: { maxRequests: 30, windowSeconds: 60 },
  // Search: 60 requests per minute
  SEARCH: { maxRequests: 60, windowSeconds: 60 },
  // Report generation: 10 requests per minute
  REPORT: { maxRequests: 10, windowSeconds: 60 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfter?: number;
}

/**
 * Check rate limit for a given action and identifier
 * @param actionType The type of action being rate limited
 * @param identifier Unique identifier (usually user ID or IP)
 * @returns RateLimitResult with allowed status and metadata
 */
export async function checkRateLimit(
  actionType: RateLimitType,
  identifier: string,
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const config = RATE_LIMITS[actionType];
  const key = `${actionType.toLowerCase()}:${identifier}`;

  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request (fail open)
      return { allowed: true, remaining: config.maxRequests, resetAt: new Date().toISOString() };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      resetAt: data.reset_at,
      retryAfter: data.retry_after,
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    // Fail open on unexpected errors
    return { allowed: true, remaining: config.maxRequests, resetAt: new Date().toISOString() };
  }
}

/**
 * Create a rate-limited version of an action
 * Higher-order function that wraps server actions with rate limiting
 */
export function withRateLimit<TInput, TOutput>(
  actionType: RateLimitType,
  getIdentifier: (data: TInput) => string,
  handler: (data: TInput) => Promise<ActionResponse<TOutput>>,
) {
  return async (data: TInput): Promise<ActionResponse<TOutput>> => {
    const identifier = getIdentifier(data);
    const rateLimitResult = await checkRateLimit(actionType, identifier);

    if (!rateLimitResult.allowed) {
      const retryAfter = rateLimitResult.retryAfter || 60;
      return {
        success: false,
        message: `คำขอถูกจำกัด กรุณารอ ${retryAfter} วินาทีแล้วลองใหม่อีกครั้ง`,
        // Include rate limit info for client
        data: {
          rateLimited: true,
          retryAfter,
          resetAt: rateLimitResult.resetAt,
        } as any,
      };
    }

    // Execute the original handler
    return handler(data);
  };
}

/**
 * Rate limit wrapper that extracts user ID from auth context
 * Use this with withAuth-wrapped actions
 */
export function withRateLimitAuth<TInput, TOutput>(
  actionType: RateLimitType,
  handler: (
    data: TInput,
    ctx: { user: { id: string; email: string }; supabase: any },
  ) => Promise<ActionResponse<TOutput>>,
) {
  return async (
    data: TInput,
    ctx: { user: { id: string; email: string }; supabase: any },
  ): Promise<ActionResponse<TOutput>> => {
    const rateLimitResult = await checkRateLimit(actionType, ctx.user.id);

    if (!rateLimitResult.allowed) {
      const retryAfter = rateLimitResult.retryAfter || 60;
      return {
        success: false,
        message: `คำขอถูกจำกัด กรุณารอ ${retryAfter} วินาทีแล้วลองใหม่อีกครั้ง`,
      };
    }

    return handler(data, ctx);
  };
}

/**
 * Check rate limit and return early if exceeded
 * Use this for manual rate limit checks in actions
 */
export async function enforceRateLimit(
  actionType: RateLimitType,
  identifier: string,
): Promise<ActionResponse | null> {
  const result = await checkRateLimit(actionType, identifier);

  if (!result.allowed) {
    const retryAfter = result.retryAfter || 60;
    return {
      success: false,
      message: `คำขอถูกจำกัด กรุณารอ ${retryAfter} วินาทีแล้วลองใหม่อีกครั้ง`,
    };
  }

  return null; // Allowed
}
