# Static Analysis Report — Next.js 16 WMS

**Context:** Next.js 16 (App Router), Zod validation, Server Actions + React state.  
**Scope:** Data integrity, async safety, Next.js usage, edge cases.

---

## 1. Summary of Vulnerabilities

### Critical (Logic / Runtime)

| ID     | Location                                         | Issue                                                                                                                                                                              | Impact                                                                                       |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **C1** | `app/dashboard/[warehouseId]/layout.tsx`         | Warehouse access uses `user.allowed_warehouses.includes(warehouseId)` where `warehouseId` is the URL param (slug or UUID). DB may store UUIDs while URL can be code (e.g. `WH01`). | Staff with access to a warehouse can be wrongly denied (or opposite if codes/UUIDs overlap). |
| **C2** | `components/settings/BulkSchemaEditor.tsx`       | `JSON.parse(schemaJson)` on lines 30 and 56 has no try/catch. Malformed `schemaJson` throws.                                                                                       | Uncaught exception → white screen / 500 in client.                                           |
| **C3** | `components/inbound/BulkInboundManager.tsx`      | `handleUpload` calls `importInboundStock(formData)` with no try/catch. Rejected promise leaves `loading` true and no error feedback.                                               | Stuck loading state, poor UX, possible unhandled rejection.                                  |
| **C4** | `actions/settings-actions.ts` (multiple)         | `catch (err: any) { return fail(err.message); }`. If `err` is undefined (e.g. thrown non-Error), `err.message` throws. Same for `fail('Error: ' + err.message)`.                   | Secondary exception in catch → 500 instead of structured error response.                     |
| **C5** | `actions/settings-actions.ts` — `deleteCategory` | `const id = formData.get('id') as string` — no validation. Null/undefined passed to `.eq('id', id)`.                                                                               | Undefined behavior or unexpected DB response; no user-facing validation error.               |

### High (Data integrity / Validation)

| ID     | Location                                               | Issue                                                                                                                                                                    | Impact                                                                                                                               |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **H1** | `actions/settings-actions.ts` — create/update category | `JSON.parse(schema)` and `JSON.parse(units)` run inside try/catch but schema/units come from Zod with default `'[]'`. Client could send non-JSON string that passes Zod. | Thrown SyntaxError is caught and converted to fail(); safe but error message could be clearer (e.g. "Invalid JSON in schema/units"). |
| **H2** | `lib/action-utils.ts` — `validateFormData`             | `result.error.issues[0]?.message ?? 'Invalid Data'` — if Zod returns no issues (edge case), message is generic.                                                          | Minor; validation still fails.                                                                                                       |
| **H3** | `actions/auth-actions.ts` — `login`                    | After `signInWithPassword`, code uses `signInData.user?.id`. If Supabase ever returns `{ data: undefined, error: null }`, `signInData` is undefined → TypeError.         | Defensive check recommended.                                                                                                         |

### Medium (Async / Performance)

| ID     | Location                                      | Issue                                                                                                                                                                           | Impact                                                                                                  |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **M1** | `lib/action-utils.ts` — `processBulkAction`   | Runs all item actions in parallel with `Promise.all`. Large batches can cause high concurrency and rate limits.                                                                 | Possible rate-limit or connection exhaustion; consider chunking or concurrency limit.                   |
| **M2** | `actions/inbound-actions.ts` — submit handler | After RPC success, two follow-up queries (product, location) run in parallel with `Promise.all`. Errors from these are not checked; only `data` is used with optional chaining. | No crash (graceful fallbacks) but wrong labels if one query fails.                                      |
| **M3** | Server Actions returning `redirect()`         | `auth-actions` and others call `redirect()` after async work. In Next.js App Router, `redirect()` throws; any code after it in the same path must not assume success.           | Current code is correct (return after redirect not reached); ensure no shared state cleanup is skipped. |

### Low / Informational

| ID  | Location                                                              | Issue                                                                                                                                                 |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Various actions                                                       | `catch (err: any)` used instead of `catch (err: unknown)`; safe message extraction with `err instanceof Error ? err.message : String(err)` is better. |
| L2  | Client components (VisualSchemaDesigner, SchemaBuilder, UnitsBuilder) | JSON.parse is inside try/catch in useEffect; only BulkSchemaEditor is missing it.                                                                     |
| L3  | `actions/report-actions.ts` — `runReportScheduleNow`                  | Fetch + JSON parse and !res.ok branches are well handled.                                                                                             |

---

## 2. Refactored / Fixed Versions

### C1 — Layout: warehouse access by both id and code

```tsx
// app/dashboard/[warehouseId]/layout.tsx (fragment)

// Security Check (กัน Staff แอบเข้าคลังอื่น)
if (user.role !== 'admin') {
  const hasAccess =
    user.allowed_warehouses.includes(warehouse.id) ||
    user.allowed_warehouses.includes(warehouse.code);
  if (!hasAccess) {
    redirect('/dashboard');
  }
}
```

### C2 — BulkSchemaEditor: safe JSON parse

```tsx
// components/settings/BulkSchemaEditor.tsx (fragment)

const handlePreview = async () => {
  if (selectedCategories.length === 0) {
    notify.ok({ success: false, message: 'กรุณาเลือกหมวดหมู่อย่างน้อย 1 รายการ' });
    return;
  }

  let fields: any[];
  try {
    fields = JSON.parse(schemaJson);
  } catch {
    notify.ok({ success: false, message: 'รูปแบบ Schema ไม่ถูกต้อง (Invalid JSON)' });
    return;
  }

  setLoading(true);
  const result = await previewBulkEdit(selectedCategories, mode, fields);
  setLoading(false);
  // ...
};

const handleApply = async () => {
  // ...
  let fields: any[];
  try {
    fields = JSON.parse(schemaJson);
  } catch {
    notify.ok({ success: false, message: 'รูปแบบ Schema ไม่ถูกต้อง (Invalid JSON)' });
    return;
  }
  setLoading(true);
  const result = await bulkEditSchemas(selectedCategories, mode, fields, changeNotes);
  // ...
};
```

### C3 — BulkInboundManager: handle async errors and loading

```tsx
// components/inbound/BulkInboundManager.tsx (fragment)

const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !selectedCat) return;

  setLoading(true);
  setReport(null);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('warehouseId', warehouseId);
  formData.append('categoryId', selectedCat);
  formData.append('userId', userId);

  try {
    const res = await importInboundStock(formData);
    if (res.success) {
      notify.ok(res);
      setReport({ total: res.report?.total || 0, failed: 0, errors: [] });
    } else {
      notify.error('การนำเข้าข้อมูลไม่สำเร็จ');
      setReport(res.report ?? { total: 0, failed: 1, errors: [res.message ?? 'Unknown error'] });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้า';
    notify.error(message);
    setReport({ total: 0, failed: 1, errors: [message] });
  } finally {
    setLoading(false);
  }

  e.target.value = '';
};
```

### C4 & C5 — settings-actions: safe error message and validate id

```ts
// actions/settings-actions.ts — shared helper at top of file (or in action-utils)
function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? 'Unknown error');
}

// deleteCategory: validate id
export async function deleteCategory(formData: FormData): Promise<ActionResponse> {
  const id = formData.get('id');
  if (id == null || String(id).trim() === '') {
    return fail('ไม่พบรหัสหมวดหมู่');
  }
  const supabase = await createClient();
  try {
    // ... rest unchanged
  } catch (err: unknown) {
    return fail(toErrorMessage(err));
  }
}

// In every other catch in this file:
} catch (err: unknown) {
  return fail('Error: ' + toErrorMessage(err));
}
```

---

## 3. Implementation Notes

### Data integrity (Zod)

- Prefer **safeParse** everywhere and handle `!result.success` with a single, consistent response shape (e.g. `fail(message)` + optional `errors`).
- For JSON-in-string fields (e.g. schema/units), either:
  - Validate with `z.string().refine((s) => { try { JSON.parse(s); return true; } catch { return false; } }, 'Invalid JSON')`, or
  - Parse inside try/catch and return a clear message (e.g. "Invalid JSON in schema").
- In **action-utils** `validateFormData`, using `result.error.issues[0]?.message ?? 'Invalid Data'` is fine; consider logging `result.error` in development for easier debugging.

### Async safety (Server Actions)

- Every Server Action that can reject should be **awaited inside try/catch** in the caller (e.g. client components) so loading state and errors are handled.
- Avoid fire-and-forget `action()` without at least `.catch()` or try/catch.
- For bulk operations, consider **chunking** (e.g. 10–20 items per batch) or a concurrency limit (e.g. p-limit) to avoid rate limits and timeouts.

### Next.js best practices

- **'use server'** is correctly used only in action files; **'use client'** in components that use state, events, or browser APIs. No server-only imports in client components found.
- **Params in layouts/pages:** Next.js 16 can expose `params` as a Promise; your layout correctly uses `const { warehouseId } = await params;`.
- **redirect()** throws; ensure it’s not inside a try that would catch it and convert to a normal response. Current usage (return after redirect in auth) is correct.

### Edge cases

- **Null/undefined from FormData:** Always validate `formData.get('id')` (and similar) before passing to DB or Zod. Use `id == null || String(id).trim() === ''` and return a validation error.
- **External APIs (e.g. Edge Function in report-actions):** You already handle !res.ok and JSON parse failures; consider a timeout (e.g. `AbortController` + `setTimeout`) to avoid hanging requests.
- **Empty arrays:** Code that does `.map`/`.forEach` on `data || []` or `(data ?? []).map` is safe; keep this pattern where Supabase/API can return null.

### Recommended follow-ups

1. Add a small **error-boundary** or toast for unhandled promise rejections in critical flows (e.g. bulk upload, schema apply).
2. Standardize **catch (err: unknown)** and a single `toErrorMessage(err)` (or reuse from a lib) across all actions.
3. Optionally add **Zod schema for JSON strings** (e.g. `z.string().transform((s) => JSON.parse(s))` with a custom error map) for schema/units so invalid JSON fails at validation with a clear message.
4. Document that **allowed_warehouses** may contain either warehouse UUIDs or codes and that layout checks both for access.

---

_Report generated from static analysis of the WMSCPP Next.js codebase._
