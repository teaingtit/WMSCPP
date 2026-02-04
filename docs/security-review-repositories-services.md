# Security & Robustness Review: Repositories and Services

**Scope:** `src/core`, `src/infrastructure/repositories`, `src/services`, and related actions.  
**Focus:** Race conditions, type safety, error handling, input validation.

---

## 1. Issues Found and Fixes Applied

### 1.1 Race Conditions (Optimistic Locking)

| Issue                                                                                                                                                               | Location                                | Fix                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Direct `updateStock(sku, qty)` had no OCC** – Two users updating the same SKU at the same time could overwrite each other (last write wins).                      | `InventoryService.updateStock`, actions | Interface already supported `expectedCurrentQty`. **Service** now accepts optional `options?: { expectedCurrentQty?: number }` and forwards to repo. **Actions** expose it: `updateStockAction(sku, qty, { expectedCurrentQty })` and `updateStockServiceAction(sku, qty, { expectedCurrentQty })`. UI can pass the qty read when opening the form so the update only succeeds if the row hasn’t changed. |
| **`adjustStock` used raw SKU** – Called `repo.getProductBySku(sku)` and `repo.updateStock(sku, ...)` with un-normalized SKU; could mismatch if DB stores uppercase. | `InventoryService.adjustStock`          | SKU is validated and normalized with `validateSku(sku)`; all repo calls use `normalizedSku`.                                                                                                                                                                                                                                                                                                              |
| **`transferStock` used raw SKU**                                                                                                                                    | `InventoryService.transferStock`        | Same: validate and normalize SKU; pass normalized SKU and trimmed locations/performedBy to repo.                                                                                                                                                                                                                                                                                                          |
| **`bulkUpdateStock` and `syncFromERP`**                                                                                                                             | Service                                 | Documented as “last write wins”. Bulk/sync do not use OCC; per-item `updateStock` in bulk now validates each SKU/qty. OCC could be added later per item if needed.                                                                                                                                                                                                                                        |

**Recommendation for UI:** When editing stock for a product, pass `expectedCurrentQty: product.qty` (the value you read when loading the form) so concurrent edits fail safely and the user can retry with fresh data.

---

### 1.2 Type Safety

| Issue                                              | Location                                                    | Fix                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mapToProduct(row: any)`**                       | `MSSQLInventoryRepository`                                  | Introduced `MSSQLProductRow` interface; `mapToProduct` now takes `MSSQLProductRow`.                                                            |
| **`.query<any>()`**                                | `MSSQLInventoryRepository` (getProducts, getProductBySku)   | Replaced with `.query<MSSQLProductRow>()`.                                                                                                     |
| **Unsafe `row.Type as TransactionType`**           | MSSQL/Supabase `getTransactionHistory` and `logTransaction` | Added `isTransactionType()` in core; mapping uses `isTransactionType(row.type) ? row.type : TransactionType.ADJUSTMENT` instead of blind cast. |
| **`JSON.parse(row.Metadata \|\| '{}')` can throw** | `MSSQLInventoryRepository.getTransactionHistory`            | Wrapped in try/catch; on parse failure use `{}` and log a warning.                                                                             |
| **Numeric fields from DB**                         | Both repos                                                  | Use `Number.isFinite()` checks for `qty`, `qtyChange`, `QtyChange` before use and fallback to 0 where appropriate.                             |

---

### 1.3 Error Swallowing

| Issue                                 | Location                                                                         | Fix                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Errors caught but not logged**      | MSSQL: `updateStock`, `logTransaction`, `transferStock`                          | Added `console.error` with context (sku, limit, type, etc.) and optional `error.stack` before returning failure. |
| **Supabase: no context in logs**      | getProducts, getProductBySku, getTransactionHistory, logTransaction, updateStock | Logs now include relevant context (e.g. sku, limit, error object).                                               |
| **Returning `[]` or `null` on error** | getProducts, getProductBySku, getTransactionHistory                              | Callers still get empty result but errors are logged with context so ops can debug.                              |

---

### 1.4 Input Validation

| Issue                         | Location                                   | Fix                                                                                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Negative or NaN quantity**  | Service and repos                          | **Service:** `validateQuantity(qty)` – rejects non-number, non-finite, negative, and > `Number.MAX_SAFE_INTEGER`. **Repos:** `updateStock` and transfer paths validate `typeof qty === 'number' && Number.isFinite(qty)` and `qty >= 0` (or `qty > 0` for transfers). |
| **Invalid or oversized SKU**  | Service                                    | **`validateSku(sku)`:** non-empty after trim, max length 100; returns normalized (trim + uppercase) for all repo calls. Used in getProductBySku, updateStock, adjustStock, transferStock, getTransactionHistory, bulkUpdateStock.                                     |
| **Bulk updates**              | `InventoryService.bulkUpdateStock`         | Each item validated with `validateSku` and `validateQuantity` before calling repo; invalid items increment `failed` and append to `errors` without throwing.                                                                                                          |
| **Threshold and limit**       | getLowStockProducts, getTransactionHistory | Threshold defaulted and clamped to safe number; limit clamped to 1–1000.                                                                                                                                                                                              |
| **product-inventory-actions** | Direct repo usage                          | These actions call the repository directly and do not use the service; they still accept arbitrary `sku`/`qty`. For consistency and validation, prefer the service-based actions (e.g. stock-actions, inventory-service-actions).                                     |

---

### 1.5 Critical Bug (MSSQL)

| Issue                                   | Location                                         | Fix                                                                                                    |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Broken SQL in getTransactionHistory** | `MSSQLInventoryRepository.getTransactionHistory` | Query had no `FROM` or `WHERE`. Added `FROM TransactionLogs WHERE SKU = @sku ORDER BY Timestamp DESC`. |

---

## 2. Files Touched

- **Core:** `src/core/entities/TransactionLog.ts` – added `isTransactionType()`; `src/core/entities/index.ts` – export it.
- **Infrastructure:**
  - `MSSQLInventoryRepository.ts` – SQL fix, typed rows, safe JSON/TransactionType, qty validation, error logging.
  - `SupabaseInventoryRepository.ts` – qty/type validation, `isTransactionType`, error logging with context.
- **Service:** `InventoryService.ts` – `validateSku`, `validateQuantity`, SKU normalization in adjust/transfer/bulk, NaN/finite checks, optional `expectedCurrentQty` in `updateStock`, safe threshold/limit in getLowStockProducts and getTransactionHistory.
- **Actions:**
  - `stock-actions.ts` – `updateStockAction` accepts `warehouseIdOrOptions?: string | { warehouseId?: string; expectedCurrentQty?: number }`, forwards `expectedCurrentQty` to service, uses `Number.isFinite(qty)`.
  - `inventory-service-actions.ts` – `updateStockServiceAction` accepts optional `options?: { expectedCurrentQty?: number }` and forwards to service.

---

## 3. Usage: Optimistic Locking (OCC) from the UI

To avoid lost updates when two users edit the same SKU:

1. Load product: `const product = await getProductBySkuAction(sku)`.
2. On submit, call:  
   `updateStockAction(sku, newQty, { warehouseId: '...', expectedCurrentQty: product.qty })`  
   or  
   `updateStockServiceAction(sku, newQty, { expectedCurrentQty: product.qty })`.
3. If the update fails with “Race Condition detected: Stock has changed since last read”, refetch the product and let the user edit again with the latest qty.

---

## 4. Remaining Recommendations

- **product-inventory-actions:** Prefer migrating to service-based actions so all updates go through validation and OCC.
- **Structured logging:** Consider replacing `console.error` with a logger (e.g. Pino/Winston) and structured fields for log aggregation.
- **Bulk / sync OCC:** If you need OCC for bulk or ERP sync, extend the repo/service to support `expectedCurrentQty` per row and have the caller pass it from the last read.
