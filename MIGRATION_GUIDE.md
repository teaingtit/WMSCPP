# Migration Guide: Using Service Layer in Server Actions

## 📚 Overview

This guide explains how to migrate from direct Supabase calls to using the **InventoryService** layer in your Server Actions, making your application database-agnostic.

---

## 🎯 When to Use Each Action File

### ✅ **Use `stock-actions.ts`** (NEW - Database-Agnostic)

**For simple CRUD operations:**

- Get products
- Update stock quantities
- Check stock availability
- Get transaction history
- Stock adjustments with reason tracking
- Simple location transfers

**Benefits:**

- ✅ Works with both Supabase and MSSQL
- ✅ Configurable via `DB_PROVIDER` env variable
- ✅ User-friendly error messages
- ✅ Comprehensive input validation
- ✅ Consistent response format

**Example:**

```typescript
import { updateStockAction } from '@/actions/stock-actions';

// This works regardless of DB_PROVIDER setting
const result = await updateStockAction('SKU-001', 100, warehouseId);
```

---

### ⚙️ **Keep Using Specialized Actions** (Existing - Supabase-Specific)

**For complex workflows with RPC functions:**

- [`inbound-actions.ts`](file:///c:/Users/nteai/Desktop/project/WMSCPP/src/actions/inbound-actions.ts) - Inbound transactions with validation
- [`outbound-actions.ts`](file:///c:/Users/nteai/Desktop/project/WMSCPP/src/actions/outbound-actions.ts) - Outbound transactions with status checks
- [`transfer-actions.ts`](file:///c:/Users/nteai/Desktop/project/WMSCPP/src/actions/transfer-actions.ts) - Cross-warehouse transfers with RPC
- [`bulk-import-actions.ts`](file:///c:/Users/nteai/Desktop/project/WMSCPP/src/actions/bulk-import-actions.ts) - Bulk operations

**Why keep these?**

- ⚠️ They use Supabase RPC functions with complex business logic
- ⚠️ They have warehouse-specific validations
- ⚠️ They interact with multiple tables atomically
- ⚠️ Migration would require rewriting RPC functions

**Note:** These actions are Supabase-specific and won't work when `DB_PROVIDER=MSSQL`

---

## 🔄 Migration Examples

### **Example 1: Simple Stock Update**

#### ❌ Before (Direct Supabase)

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function updateProductStock(sku: string, qty: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .update({ qty })
    .eq('sku', sku)
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, data };
}
```

#### ✅ After (Using Service Layer)

```typescript
'use server';

import { updateStockAction } from '@/actions/stock-actions';

export async function updateProductStock(sku: string, qty: number) {
  // Database-agnostic, works with Supabase or MSSQL
  return updateStockAction(sku, qty);
}
```

---

### **Example 2: Stock Adjustment with Reason**

#### ❌ Before (Direct Supabase)

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function adjustStock(sku: string, change: number, reason: string) {
  const supabase = await createClient();

  // Get current stock
  const { data: product } = await supabase.from('products').select('qty').eq('sku', sku).single();

  if (!product) {
    return { success: false, message: 'Product not found' };
  }

  const newQty = product.qty + change;

  // Update stock
  const { error: updateError } = await supabase
    .from('products')
    .update({ qty: newQty })
    .eq('sku', sku);

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  // Log transaction
  await supabase.from('transaction_logs').insert({
    sku,
    type: 'ADJUSTMENT',
    qty_change: change,
    reason,
    performed_by: 'user_id',
  });

  return { success: true };
}
```

#### ✅ After (Using Service Layer)

```typescript
'use server';

import { adjustStockAction } from '@/actions/stock-actions';

export async function adjustStock(sku: string, change: number, reason: string, userId: string) {
  // All business logic handled by service layer
  return adjustStockAction({
    sku,
    qtyChange: change,
    reason,
    performedBy: userId,
  });
}
```

---

### **Example 3: Get Products**

#### ❌ Before (Direct Supabase)

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function getProducts() {
  const supabase = await createClient();

  const { data, error } = await supabase.from('products').select('*').order('sku');

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, data };
}
```

#### ✅ After (Using Service Layer)

```typescript
'use server';

import { getAllProductsAction } from '@/actions/stock-actions';

export async function getProducts() {
  // Database-agnostic, includes error handling
  return getAllProductsAction();
}
```

---

## 📋 Available Actions in `stock-actions.ts`

| Action                                     | Purpose                     | Input                                         | Output                                                            |
| ------------------------------------------ | --------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `getAllProductsAction()`                   | Get all products            | None                                          | `{ success, message, data: { products, count } }`                 |
| `getProductBySkuAction(sku)`               | Get single product          | SKU string                                    | `{ success, message, data: { product } }`                         |
| `updateStockAction(sku, qty, whId?)`       | Update stock quantity       | SKU, quantity, optional warehouse ID          | `{ success, message, data: { product } }`                         |
| `adjustStockAction(input, whId?)`          | Adjust stock with reason    | `StockAdjustmentInput`, optional warehouse ID | `{ success, message, data: { transaction } }`                     |
| `transferStockAction(input, whId?)`        | Transfer between locations  | `StockTransferInput`, optional warehouse ID   | `{ success, message, data: { transaction } }`                     |
| `checkStockAvailabilityAction(sku, qty)`   | Check if stock is available | SKU, required quantity                        | `{ success, message, data: { available, currentQty, deficit? } }` |
| `getTransactionHistoryAction(sku, limit?)` | Get transaction logs        | SKU, optional limit (default: 50)             | `{ success, message, data: { transactions, count } }`             |
| `getLowStockProductsAction(threshold?)`    | Get low stock products      | Optional threshold (default: 10)              | `{ success, message, data: { products, threshold, count } }`      |
| `getInventorySummaryAction()`              | Get inventory statistics    | None                                          | `{ success, message, data: { totalItems, totalQuantity } }`       |
| `syncFromERPAction(whId?)`                 | Sync from MSSQL to Supabase | Optional warehouse ID                         | `{ success, message, data: { synced, failed, errors } }`          |

---

## 🎨 Usage in UI Components

### **Server Component Example**

```typescript
// app/dashboard/[warehouseId]/inventory/page.tsx
import { getAllProductsAction } from '@/actions/stock-actions';

export default async function InventoryPage() {
  const result = await getAllProductsAction();

  if (!result.success) {
    return <div className="error">{result.message}</div>;
  }

  return (
    <div>
      <h1>Inventory ({result.data.count} items)</h1>
      <ProductList products={result.data.products} />
    </div>
  );
}
```

### **Client Component Example**

```typescript
'use client';

import { updateStockAction } from '@/actions/stock-actions';
import { useState } from 'react';

export function StockUpdateForm({ sku }: { sku: string }) {
  const [qty, setQty] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await updateStockAction(sku, qty);

    if (result.success) {
      alert(result.message); // "Stock updated successfully for SKU-001"
    } else {
      alert(`Error: ${result.message}`);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Stock'}
      </button>
    </form>
  );
}
```

---

## 🔄 Switching Databases

### **Development (Supabase)**

```bash
# .env.local
DB_PROVIDER=SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### **Production (MSSQL)**

```bash
# .env.local
DB_PROVIDER=MSSQL
MSSQL_SERVER=your-server.database.windows.net
MSSQL_DATABASE=your_database
MSSQL_USER=your_username
MSSQL_PASSWORD=your_password
```

**No code changes needed!** Just update environment variables and restart.

---

## ⚠️ Important Notes

### **1. Complex Workflows Still Use Supabase**

Actions like `submitInbound`, `submitOutbound`, and `submitCrossTransfer` use Supabase RPC functions and cannot be made database-agnostic without significant refactoring.

**Recommendation:** Keep using these for complex workflows. They are battle-tested and optimized.

### **2. Error Handling**

All new actions return user-friendly error messages:

```typescript
const result = await updateStockAction('INVALID-SKU', 100);

if (!result.success) {
  // User-friendly message
  console.log(result.message);
  // "Product with SKU INVALID-SKU not found"

  // NOT a technical error like:
  // "PostgresError: relation 'products' does not exist"
}
```

### **3. Input Validation**

All actions validate inputs before calling the service layer:

```typescript
// ❌ This will fail gracefully
await updateStockAction('', -10);
// Returns: { success: false, message: "SKU is required" }

await updateStockAction('SKU-001', -10);
// Returns: { success: false, message: "Quantity cannot be negative" }
```

### **4. Cache Revalidation**

Pass `warehouseId` to automatically revalidate Next.js cache:

```typescript
await updateStockAction('SKU-001', 100, 'warehouse-123');
// Automatically revalidates:
// - /dashboard/warehouse-123/inventory
// - /dashboard/warehouse-123/history
```

---

## 📊 Migration Checklist

- [ ] Identify actions that use simple CRUD operations
- [ ] Replace direct Supabase calls with `stock-actions.ts` imports
- [ ] Update error handling to use `result.success` and `result.message`
- [ ] Test with both `DB_PROVIDER=SUPABASE` and `DB_PROVIDER=MSSQL`
- [ ] Keep complex RPC-based actions unchanged
- [ ] Update UI components to handle new response format
- [ ] Add warehouse ID for cache revalidation where applicable

---

## 🎯 Best Practices

### ✅ **DO**

- Use `stock-actions.ts` for simple CRUD operations
- Handle errors gracefully in UI
- Pass warehouse ID for cache revalidation
- Validate user inputs before calling actions
- Use TypeScript types for type safety

### ❌ **DON'T**

- Don't mix direct Supabase calls with service layer calls
- Don't bypass input validation
- Don't ignore error messages
- Don't use `stock-actions.ts` for complex RPC workflows
- Don't hardcode database provider in code

---

## 🔗 Related Documentation

- [Repository Pattern](file:///c:/Users/nteai/Desktop/project/WMSCPP/REPOSITORY_PATTERN.md)
- [Service Layer Guide](file:///c:/Users/nteai/Desktop/project/WMSCPP/SERVICE_LAYER.md)
- [InventoryService API](file:///c:/Users/nteai/Desktop/project/WMSCPP/src/services/InventoryService.ts)
- [Stock Actions](file:///c:/Users/nteai/Desktop/project/WMSCPP/src/actions/stock-actions.ts)

---

**Last Updated:** 2026-02-04  
**Status:** ✅ Ready for Production
