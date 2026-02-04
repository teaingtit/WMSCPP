/**
 * Error Sanitization Utilities
 *
 * @description
 * Provides utilities to sanitize error messages before sending to clients.
 * Prevents exposure of sensitive information like database schema, column names,
 * file paths, and stack traces in production.
 *
 * @security
 * - Maps internal errors to user-friendly messages
 * - Strips sensitive patterns from error messages
 * - Logs original errors server-side for debugging
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Known error patterns mapped to user-friendly messages
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // Connection errors
  ECONNREFUSED: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
  ETIMEDOUT: 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง',
  ENOTFOUND: 'ไม่พบเซิร์ฟเวอร์ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
  ENETUNREACH: 'ไม่สามารถเข้าถึงเครือข่ายได้ กรุณาตรวจสอบการเชื่อมต่อ',

  // Database errors
  '23505': 'ข้อมูลนี้มีอยู่ในระบบแล้ว', // Unique constraint violation
  '23503': 'ไม่สามารถดำเนินการได้เนื่องจากมีข้อมูลที่เกี่ยวข้อง', // Foreign key violation
  '23502': 'กรุณากรอกข้อมูลให้ครบถ้วน', // Not null violation
  '22P02': 'รูปแบบข้อมูลไม่ถูกต้อง', // Invalid text representation
  '42501': 'คุณไม่มีสิทธิ์ดำเนินการนี้', // Insufficient privilege
  '42P01': 'ข้อมูลไม่พบในระบบ', // Undefined table (generic)
  PGRST116: 'ไม่พบข้อมูลที่ต้องการ', // No rows returned

  // Authentication errors
  'Invalid login credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'Email not confirmed': 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
  'User not found': 'ไม่พบบัญชีผู้ใช้นี้ในระบบ',
  'Password should be at least': 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',

  // Rate limiting
  'rate limit': 'คำขอถูกจำกัด กรุณารออีกสักครู่แล้วลองใหม่',
  'too many requests': 'คำขอมากเกินไป กรุณารออีกสักครู่',

  // Business logic
  'insufficient stock': 'สินค้าคงคลังไม่เพียงพอ',
  'not found': 'ไม่พบข้อมูลที่ต้องการ',
  'already exists': 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
  'Race Condition': 'ข้อมูลถูกเปลี่ยนแปลงโดยผู้อื่น กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง',
};

/**
 * Patterns that indicate sensitive information
 */
const SENSITIVE_PATTERNS = [
  /at\s+[\w.]+\s+\([^)]+:\d+:\d+\)/gi, // Stack trace lines
  /\/[\w/.-]+\.(?:ts|js|tsx|jsx):\d+/gi, // File paths with line numbers
  /column\s+"?\w+"?/gi, // Column names
  /table\s+"?\w+"?/gi, // Table names
  /relation\s+"?\w+"?/gi, // Relation names
  /constraint\s+"?\w+"?/gi, // Constraint names
  /schema\s+"?\w+"?/gi, // Schema names
  /password|secret|key|token|credential/gi, // Sensitive keywords
  /SUPABASE_|MSSQL_|NEXT_PUBLIC_/gi, // Environment variable prefixes
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
  /postgresql:\/\/[^\s]+/gi, // Connection strings
  /mssql:\/\/[^\s]+/gi,
];

/**
 * Generic fallback message
 */
const GENERIC_ERROR_MESSAGE =
  'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่กรุณาติดต่อผู้ดูแลระบบ';

/**
 * Options for error sanitization
 */
interface SanitizeOptions {
  /** Log original error to console (default: true in development) */
  logOriginal?: boolean;
  /** Report to Sentry (default: true in production) */
  reportToSentry?: boolean;
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** User ID for Sentry reporting */
  userId?: string;
}

/**
 * Sanitize an error message for client consumption
 *
 * @param error - The error to sanitize (Error object or string)
 * @param options - Sanitization options
 * @returns A user-friendly, safe error message
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   return fail(sanitizeError(error, { context: { sku: 'SKU-001' } }));
 * }
 * ```
 */
export function sanitizeError(error: unknown, options: SanitizeOptions = {}): string {
  const {
    logOriginal = process.env.NODE_ENV === 'development',
    reportToSentry = process.env.NODE_ENV === 'production',
    context = {},
    userId,
  } = options;

  // Extract error message
  let originalMessage: string;
  let errorCode: string | undefined;

  if (error instanceof Error) {
    originalMessage = error.message;
    // Check for Supabase/PostgreSQL error codes
    const errWithCode = error as { code?: string };
    errorCode = errWithCode.code;
  } else if (typeof error === 'string') {
    originalMessage = error;
  } else if (error && typeof error === 'object') {
    const errObj = error as { message?: string; code?: string; error?: string };
    originalMessage = errObj.message || errObj.error || JSON.stringify(error);
    errorCode = errObj.code;
  } else {
    originalMessage = 'Unknown error';
  }

  // Log original error in development
  if (logOriginal) {
    console.error('[Error Sanitizer] Original error:', {
      message: originalMessage,
      code: errorCode,
      context,
      error,
    });
  }

  // Report to Sentry in production
  if (reportToSentry && error instanceof Error) {
    Sentry.captureException(error, {
      tags: { sanitized: 'true' },
      extra: { context, originalMessage },
      ...(userId ? { user: { id: userId } } : {}),
    });
  }

  // Check for known error codes first
  const codeMessage = errorCode ? ERROR_MESSAGE_MAP[errorCode] : undefined;
  if (codeMessage) return codeMessage;

  // Check for known error patterns
  const lowerMessage = originalMessage.toLowerCase();
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MESSAGE_MAP)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }

  // Strip sensitive information from message
  let sanitizedMessage = originalMessage;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED]');
  }

  // If the sanitized message is mostly redacted or too technical, use generic message
  const redactedCount = (sanitizedMessage.match(/\[REDACTED\]/g) || []).length;
  const hasTechnicalTerms = /error|exception|undefined|null|NaN|function|object/i.test(
    sanitizedMessage,
  );

  if (redactedCount > 2 || hasTechnicalTerms || sanitizedMessage.length > 200) {
    return GENERIC_ERROR_MESSAGE;
  }

  return sanitizedMessage;
}

/**
 * Create a sanitized error response for actions
 *
 * @param error - The error to sanitize
 * @param options - Sanitization options
 * @returns Object with success: false and sanitized message
 */
export function sanitizedFail(
  error: unknown,
  options: SanitizeOptions = {},
): { success: false; message: string } {
  return {
    success: false,
    message: sanitizeError(error, options),
  };
}

/**
 * Higher-order function that wraps an action with error sanitization
 *
 * @param action - The action function to wrap
 * @param defaultContext - Default context for error logging
 * @returns Wrapped action with automatic error sanitization
 *
 * @example
 * ```typescript
 * export const myAction = withErrorSanitization(
 *   async (input: MyInput) => {
 *     // action logic
 *   },
 *   { action: 'myAction' }
 * );
 * ```
 */
export function withErrorSanitization<TInput, TOutput>(
  action: (input: TInput) => Promise<{ success: boolean; message: string; data?: TOutput }>,
  defaultContext: Record<string, unknown> = {},
) {
  return async (input: TInput): Promise<{ success: boolean; message: string; data?: TOutput }> => {
    try {
      return await action(input);
    } catch (error) {
      return sanitizedFail(error, {
        context: { ...defaultContext, input },
      }) as { success: boolean; message: string; data?: TOutput };
    }
  };
}

/**
 * Safely extract error message from unknown error type
 * Use this when you need the raw message but want null-safety
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

/**
 * Check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: string): boolean {
  if (error && typeof error === 'object') {
    const errWithCode = error as { code?: string };
    return errWithCode.code === code;
  }
  return false;
}

/**
 * Check if error is a duplicate/unique constraint violation
 */
export function isDuplicateError(error: unknown): boolean {
  return isErrorCode(error, '23505');
}

/**
 * Check if error is a foreign key violation
 */
export function isForeignKeyError(error: unknown): boolean {
  return isErrorCode(error, '23503');
}

/**
 * Check if error is a not null violation
 */
export function isNotNullError(error: unknown): boolean {
  return isErrorCode(error, '23502');
}
