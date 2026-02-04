# WMS Security Audit Report

**Audit Date:** 2026-02-04
**Auditor Role:** Lead QA Engineer & Security Auditor
**Target:** Next.js 16 Warehouse Management System
**Stack:** Next.js (App Router), TypeScript, Supabase, MSSQL

---

## Executive Summary

This security audit analyzed the WMS codebase for vulnerabilities across SQL injection, type safety, and sensitive data exposure vectors. The codebase demonstrates **strong security practices** overall, with a few areas requiring attention.

| Category                | Risk Level | Status                                        |
| ----------------------- | ---------- | --------------------------------------------- |
| SQL Injection           | **LOW**    | Well-protected with parameterized queries     |
| Type Safety             | **MEDIUM** | Some `as` casts and error handling patterns   |
| Sensitive Data Exposure | **LOW**    | Good practices with minor improvements needed |
| Race Conditions         | **LOW**    | OCC implemented, but UI needs hardening       |
| Input Validation        | **LOW**    | Comprehensive validation at multiple layers   |

---

## Phase 4: Detailed Vulnerability Analysis

### 1. SQL Injection Analysis

#### 1.1 MSSQL Repository (`src/infrastructure/repositories/MSSQLInventoryRepository.ts`)

**Status: SECURE**

All database queries use parameterized queries with the `mssql` library's `.input()` method:

```typescript
// Line 126-138: Parameterized query example
const result = await poolConnection.request().input('sku', sql.VarChar, sku) // Parameterized
  .query<MSSQLProductRow>(`
        SELECT ... FROM Products WHERE SKU = @sku AND IsActive = 1
    `);
```

**Verified Secure Patterns:**

- `getProductBySku()` - Uses `@sku` parameter (line 128)
- `updateStock()` - Uses `@sku`, `@qty`, `@expected` parameters (lines 168-183)
- `logTransaction()` - All 9 fields parameterized (lines 229-249)
- `getTransactionHistory()` - Uses `@sku`, `@limit` parameters (lines 277-298)
- `transferStock()` - Uses `@sku`, `@toLocation` parameters (lines 389-397)

**No Dynamic SQL Concatenation Found**

#### 1.2 Supabase Repository (`src/infrastructure/repositories/SupabaseInventoryRepository.ts`)

**Status: SECURE**

Supabase client uses builder pattern which inherently parameterizes queries:

```typescript
// Line 63-67: Supabase query builder (safe by design)
const { data, error } = await this.supabase
  .from('products')
  .select('sku, name, qty, location, batch_no')
  .eq('sku', sku) // Automatically parameterized
  .single();
```

**Assessment:** Supabase PostgREST automatically sanitizes inputs.

---

### 2. Type Safety Analysis

#### 2.1 Explicit `as any` Casts

**Location:** `src/lib/action-utils.ts:82`

```typescript
const err = error as { code?: string }; // Potential type leak
```

**Risk:** LOW - Used for PostgreSQL error code checking, contained scope.

**Location:** `src/lib/action-utils.ts:37`

```typescript
errors: result.error.flatten().fieldErrors as Record<string, string[]>,
```

**Risk:** LOW - Zod's type inference is well-established.

#### 2.2 Implicit Type Coercions

**Location:** `src/services/InventoryService.ts:36-46`

```typescript
function validateQuantity(qty: number): { valid: true } | { valid: false; error: string } {
    if (typeof qty !== 'number' || !Number.isFinite(qty)) {  // Runtime check
        return { valid: false, error: 'Quantity must be a finite number' };
    }
```

**Assessment:** GOOD - Runtime validation protects against type coercion.

#### 2.3 Potential Type Safety Issues

**Issue 1: Server Action Input Trust**

**Location:** Multiple action files

Server Actions receive untrusted data from the client. While validation exists, some actions could benefit from explicit Zod schema validation:

```typescript
// src/actions/stock-actions.ts:58-77
export async function getProductBySkuAction(sku: string) {
    // Manual validation only
    if (!sku || sku.trim() === '') {
        return fail('SKU is required');
    }
```

**Recommendation:** Add Zod schema validation for all public action inputs:

```typescript
const skuSchema = z
  .string()
  .min(1)
  .max(100)
  .transform((s) => s.trim().toUpperCase());
```

**Issue 2: Number Parsing Without Explicit Schema**

**Location:** `src/services/InventoryService.ts:278`

```typescript
const limitNum = Math.min(Math.max(1, Math.floor(Number(limit) || 50)), 1000);
```

**Risk:** LOW - Handled with fallback, but `Number()` can produce unexpected results with objects.

---

### 3. Sensitive Data Exposure Analysis

#### 3.1 Database Credentials

**Location:** `src/infrastructure/repositories/MSSQLInventoryRepository.ts:28-44`

```typescript
const config: sql.config = {
    server: process.env['MSSQL_SERVER'] || 'localhost',
    port: parseInt(process.env['MSSQL_PORT'] || '1433'),
    database: process.env['MSSQL_DATABASE'] || '',
    user: process.env['MSSQL_USER'] || '',
    password: process.env['MSSQL_PASSWORD'] || '',  // Loaded from env
```

**Status: SECURE** - Credentials properly loaded from environment variables.

**Verified:** `.env` is in `.gitignore` (standard Next.js practice).

#### 3.2 Error Stack Trace Exposure

**VULNERABILITY FOUND**

**Location:** `src/infrastructure/repositories/MSSQLInventoryRepository.ts:117-118`

```typescript
console.error('[MSSQLInventoryRepository] getProducts error:', error);
if (error instanceof Error) {
  console.error('[MSSQLInventoryRepository] getProducts stack:', error.stack);
}
```

**Risk:** MEDIUM in production if logs are exposed.

**Similar Patterns Found:**

- Line 144-146: `getProductBySku` stack logging
- Line 212-215: `updateStock` stack logging
- Line 256-264: `logTransaction` stack logging
- Line 324-327: `getTransactionHistory` stack logging
- Line 413-420: `transferStock` stack logging

**Recommendation:**

```typescript
// Use structured logging without exposing stack in production
if (process.env.NODE_ENV === 'development') {
  console.error('[MSSQLInventoryRepository] stack:', error.stack);
} else {
  // Log to Sentry/monitoring without exposing to client
  Sentry.captureException(error);
}
```

#### 3.3 Client-Side Error Messages

**Location:** `src/actions/stock-actions.ts:44-48`

```typescript
const message =
  error instanceof Error
    ? error.message // Could expose internal details
    : 'Failed to fetch products. Please try again.';
return fail(message);
```

**Risk:** LOW-MEDIUM - Raw error messages could leak:

- Database column names
- Table structure hints
- Internal file paths

**Recommendation:** Sanitize error messages before returning to client:

```typescript
const SAFE_ERROR_MAP: Record<string, string> = {
  ECONNREFUSED: 'Service temporarily unavailable',
  ETIMEOUT: 'Request timed out, please try again',
  // ... map internal errors to user-friendly messages
};

function sanitizeError(error: Error): string {
  for (const [key, message] of Object.entries(SAFE_ERROR_MAP)) {
    if (error.message.includes(key)) return message;
  }
  return 'An unexpected error occurred';
}
```

#### 3.4 Supabase Keys

**Location:** `e2e/fixtures/auth.ts:7-8`

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
```

**CRITICAL FINDING:** Service role key usage in test fixtures.

**Status:** ACCEPTABLE for E2E tests only (service key needed for seeding).

**Verify:** `SUPABASE_SERVICE_ROLE_KEY` is NEVER exposed in:

- Client-side code (`src/components/*`)
- Public environment variables (`NEXT_PUBLIC_*`)

---

### 4. Additional Security Findings

#### 4.1 Race Condition Mitigation

**Location:** `src/services/InventoryService.ts:196-203`

```typescript
// Optimistic Concurrency Control: only update if current qty still matches
const updateResult = await repo.updateStock(normalizedSku, newQty, {
  expectedCurrentQty: product.qty,
});
```

**Status: IMPLEMENTED** - OCC protects against lost updates.

**UI Gap Identified:** Button debouncing not verified at component level. E2E tests added to verify.

#### 4.2 Transaction Atomicity

**Finding:** `transferStock` operation is NOT atomic:

**Location:** `src/infrastructure/repositories/SupabaseInventoryRepository.ts:277-302`

```typescript
// Step 1: Update location
const { error: updateError } = await this.supabase
  .from('products')
  .update({ location: toLocation })
  .eq('sku', sku);

// Step 2: Log transaction (separate operation)
return this.logTransaction(transactionLog);
```

**Risk:** If Step 2 fails, Step 1 is not rolled back.

**Recommendation:** Use Supabase RPC function with transaction:

```sql
CREATE OR REPLACE FUNCTION transfer_stock(
    p_sku TEXT, p_from TEXT, p_to TEXT, p_qty INT, p_user TEXT
) RETURNS JSONB AS $$
BEGIN
    -- All operations in single transaction
    UPDATE products SET location = p_to WHERE sku = p_sku;
    INSERT INTO transaction_logs (...) VALUES (...);
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
```

#### 4.3 Missing Rate Limiting

**Observation:** Server Actions have no rate limiting visible in code.

**Recommendation:** Add rate limiting middleware:

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function adjustStockAction(input: StockAdjustmentInput) {
  const rateLimitResult = await rateLimit(input.performedBy, 'adjustStock', {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  });
  if (!rateLimitResult.allowed) {
    return fail('Too many requests. Please try again later.');
  }
  // ... rest of action
}
```

#### 4.4 CSRF Protection

**Status: INHERENT** - Next.js Server Actions include CSRF protection by default via:

- Same-origin request validation
- Action ID binding

No additional CSRF concerns identified.

---

### 5. Code Quality Issues Affecting Security

#### 5.1 Test Coverage Gap

**Observation:** `test/services/InventoryService.test.ts:642-656` tests for limit validation throw error:

```typescript
it('should enforce maximum limit of 1000', async () => {
  await expect(InventoryService.getTransactionHistory('TEST-001', 5000)).rejects.toThrow(
    'Limit must be between 1 and 1000',
  );
});
```

**But actual implementation:**

```typescript
const limitNum = Math.min(Math.max(1, Math.floor(Number(limit) || 50)), 1000);
```

**Issue:** Code clamps instead of throwing - test expectation mismatch.

---

## Recommendations Summary

### Critical (Fix Immediately)

1. None identified - codebase has good security fundamentals

### High Priority (Fix Within Sprint)

1. **Sanitize error messages** before returning to client
2. **Add transaction atomicity** to `transferStock` operations
3. **Implement rate limiting** on sensitive actions

### Medium Priority (Fix Within Quarter)

1. **Standardize Zod validation** on all Server Action inputs
2. **Conditional stack trace logging** (development only)
3. **Add structured error codes** instead of exposing raw messages

### Low Priority (Technical Debt)

1. Fix test expectation for limit enforcement behavior
2. Add security headers configuration documentation
3. Document authentication flow security assumptions

---

## Test Coverage Recommendations

Add these security-focused tests:

```typescript
// test/security/injection.test.ts
describe('SQL Injection Prevention', () => {
  it('should safely handle malicious SKU input', async () => {
    const maliciousSku = "'; DROP TABLE products; --";
    const result = await InventoryService.getProductBySku(maliciousSku);
    // Should return null, not crash
    expect(result).toBeNull();
  });
});

// test/security/error-exposure.test.ts
describe('Error Message Sanitization', () => {
  it('should not expose database column names in errors', async () => {
    // Trigger a constraint violation
    const result = await someAction(invalidData);
    expect(result.message).not.toMatch(/column|table|constraint/i);
  });
});
```

---

## Conclusion

The WMS codebase demonstrates **mature security practices**:

- Proper parameterized queries throughout
- Server-only service layer isolation
- OCC for race condition prevention
- Environment-based credential management

Key areas for improvement:

- Error message sanitization for production
- Transaction atomicity for multi-step operations
- Rate limiting implementation

**Overall Security Rating: B+ (Good)**

---

_Report generated by Security Audit Process_
_Next review recommended: Q2 2026_
