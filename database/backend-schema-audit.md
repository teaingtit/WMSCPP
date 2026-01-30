# Backend vs Database Schema Audit

**Purpose:** Find any tables or functions referenced in the backend that are missing from the schema/functions (or vice versa).

---

## 1. Tables Referenced in Backend

| Table                      | Where used                                                                                                         | In schema.sql |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------- |
| `user_roles`               | auth-service, auth-actions, middleware, user-actions, dashboard-actions, action-utils, status-actions              | ✅            |
| `profiles`                 | user-actions                                                                                                       | ✅            |
| `warehouses`               | inventory page, layout, warehouse-actions, settings, bulk-import, export, dashboard, db-helpers, debug, api/health | ✅            |
| `locations`                | inbound, transfer, bulk-import, history-actions                                                                    | ✅            |
| `product_categories`       | inbound, schema-version, settings, bulk-import, bulk-schema, action-utils, export, history                         | ✅            |
| `category_schema_versions` | schema-version-actions                                                                                             | ✅            |
| `products`                 | inbound, settings, product-search, schema-version, bulk-import, export                                             | ✅            |
| `stocks`                   | inventory page, transfer, outbound, audit, dashboard, export                                                       | ✅            |
| `transactions`             | user-actions, transfer-actions, dashboard-actions, history-actions                                                 | ✅            |
| `audit_sessions`           | audit-actions, dashboard-actions                                                                                   | ✅            |
| `audit_items`              | audit-actions                                                                                                      | ✅            |
| `status_definitions`       | status-actions                                                                                                     | ✅            |
| `entity_statuses`          | status-actions, outbound-actions, transfer-actions                                                                 | ✅            |
| `lot_statuses`             | status-actions                                                                                                     | ✅            |
| `status_change_logs`       | status-actions, history-actions                                                                                    | ✅            |
| `partial_status_removals`  | status-actions                                                                                                     | ✅            |
| `entity_notes`             | status-actions                                                                                                     | ✅            |

**Result:** All 17 tables used in the backend exist in `database/schema.sql`. **No missing tables.**

---

## 2. Functions (RPC) Called in Backend

| Function                      | Where used                              | In functions.sql |
| ----------------------------- | --------------------------------------- | ---------------- |
| `process_inbound_transaction` | inbound-actions.ts                      | ✅               |
| `process_inbound_batch`       | bulk-import-actions.ts                  | ✅               |
| `deduct_stock`                | outbound-actions.ts                     | ✅               |
| `transfer_stock`              | transfer-actions.ts                     | ✅               |
| `transfer_cross_stock`        | transfer-actions.ts (supabaseAdmin.rpc) | ✅               |
| `create_warehouse_xyz_grid`   | settings-actions.ts                     | ✅               |
| `get_next_schema_version`     | schema-version-actions.ts               | ✅               |
| `process_audit_adjustment`    | audit-actions.ts                        | ✅               |

**Result:** All 8 RPCs called from the app exist in `database/functions.sql`. **No missing functions.**

---

## 3. Schema/Functions Not Called from App (OK)

- **handle_new_user** — Trigger on `auth.users`; not called from app (DB-only).
- **update_updated_at_column** — Used by triggers; not called from app (DB-only).

These are required by the schema/triggers; no backend change needed.

---

## 4. Optional Consistency: `TABLES` Constant

`src/lib/constants.ts` defines only 9 table names:

- `USER_ROLES`, `WAREHOUSES`, `PRODUCTS`, `PRODUCT_CATEGORIES`, `STOCKS`, `LOCATIONS`, `TRANSACTIONS`, `AUDIT_SESSIONS`, `AUDIT_ITEMS`

Tables used as string literals (not in `TABLES`) elsewhere in the code:

- `profiles`, `category_schema_versions`, `status_definitions`, `entity_statuses`, `lot_statuses`, `status_change_logs`, `partial_status_removals`, `entity_notes`

**Suggestion (optional):** Add these to `TABLES` and use `TABLES.*` where applicable for consistency and fewer typos. Not required for correctness; all tables exist in the DB.

---

## 5. Summary

| Check                             | Result                                    |
| --------------------------------- | ----------------------------------------- |
| Tables used in backend vs schema  | ✅ All 17 tables exist in schema          |
| RPCs used in backend vs functions | ✅ All 8 functions exist in functions.sql |
| Missing tables                    | **None**                                  |
| Missing functions                 | **None**                                  |

**Conclusion:** The backend codebase does not reference any table or function that is missing from the database schema or functions. The database and backend are aligned.
