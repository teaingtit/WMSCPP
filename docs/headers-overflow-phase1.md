# Phase 1: Reduce chance of oversized headers (Supabase Auth / session)

This checklist helps prevent **UND_ERR_HEADERS_OVERFLOW** by keeping Supabase Auth JWTs and session cookies small. Perform these steps in the **Supabase Dashboard** and confirm app code stays aligned.

## Phase 1 verification (MCP) — completed

These checks were run via **user-supabase** and **cursor-ide-browser** MCP:

| Check                                 | Tool                                                                                            | Result                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1 JWT small**                     | `execute_sql`: list routines named `%hook%` or `%access_token%` in public/auth                  | **No custom JWT hook** in DB → default JWT is small. ✓                                                                                                                                                                                                                                                                          |
| **1.2 No large Auth metadata**        | `execute_sql`: `octet_length(raw_user_meta_data::text)` and `raw_app_meta_data` on `auth.users` | **Small metadata**: user_meta 24–66 bytes, app_meta 45 bytes per user → no large arrays in Auth. ✓                                                                                                                                                                                                                              |
| **1.2 allowed_warehouses in DB only** | `list_tables` / `execute_sql` on `public.user_roles`                                            | **Confirmed**: `allowed_warehouses` column exists in `user_roles`; app loads it from DB in `auth-service.ts` and middleware. ✓                                                                                                                                                                                                  |
| **Dashboard (1.1 / 1.3)**             | `browser_navigate` to `.../auth/hooks`                                                          | **Requires sign-in**: Supabase Dashboard redirected to sign-in. When logged in, open [Auth Hooks](https://supabase.com/dashboard/project/wpufstdvknzrrsvmcgwu/auth/hooks) and [Auth Sessions](https://supabase.com/dashboard/project/wpufstdvknzrrsvmcgwu/auth/sessions) to confirm no custom hook and minimal session options. |

**Summary:** Phase 1 is satisfied from the database and app side: no custom JWT hook, small Auth metadata, and `allowed_warehouses` only in `user_roles`. Optional: after signing in to the Dashboard, confirm Auth → Hooks (none or minimal) and Auth → Sessions (persistence/cookie settings).

---

## Using MCP tools (user-supabase)

You can use the **user-supabase** MCP to verify Phase 1 and look up official docs:

| Tool              | Purpose                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_project_url` | Get your project API URL (e.g. for Dashboard link).                                                                                                                                                  |
| `list_tables`     | Confirm `public.user_roles` exists and has `allowed_warehouses` in DB only (not in Auth).                                                                                                            |
| `execute_sql`     | Run read-only SQL (e.g. `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_roles'`) to verify schema.                               |
| `search_docs`     | Search Supabase docs with a GraphQL query; use `query { searchDocs(query: "JWT custom claims", limit: 5) { edges { node { ... on Guide { title href content } } } } }` to find JWT/session guidance. |

**Official docs (from search):**

- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — Keep JWT minimal; add only small claims. Use “Minimal JWT” pattern to strip optional claims and reduce size.
- [JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) — Required vs optional claims; avoid large `user_metadata` / `app_metadata` in tokens.
- [User sessions](https://supabase.com/docs/guides/auth/sessions) — Session persistence and cookie behavior (Dashboard: **Authentication → Sessions**).

---

## 1.1 Keep Supabase JWT small (Supabase Dashboard)

- [x] **Verified via MCP:** No custom JWT hook in DB (public/auth) → default JWT is small.
- [ ] Open **Supabase Dashboard → Authentication → Hooks** (when signed in): confirm no Custom Access Token Hook, or that it only adds minimal claims.
- [ ] If you add a hook later: do **not** put large structures (e.g. full `allowed_warehouses` array) into the JWT.

**Goal:** Smaller session cookie and access token so `Set-Cookie` and Auth-related headers stay under Node’s header size limit (~32KB default).

---

## 1.2 Avoid storing large data in Auth metadata

- [x] **Verified via MCP:** `auth.users` metadata is small (24–66 bytes user_meta, 45 bytes app_meta); `allowed_warehouses` lives in `public.user_roles` only.
- [x] App loads `allowed_warehouses` from `user_roles` in `src/lib/auth-service.ts` and in middleware — **DB-only**, not in JWT.
- [x] In app code, `user_metadata` is minimal (first_name, last_name, full_name only) in `src/actions/user-actions.ts`.

---

## 1.3 Session persistence (optional)

- [ ] When signed in to Supabase: open **Authentication → Sessions** and review session persistence / cookie options; prefer a **single, minimal** session cookie.
- Direct link: [Auth Sessions](https://supabase.com/dashboard/project/wpufstdvknzrrsvmcgwu/auth/sessions).

---

## After Phase 1

- Session and JWT stay minimal so that future growth in `user_roles` or metadata does not push headers over the limit again.
- If overflow still occurs, proceed to **Phase 2** (raise Node’s `--max-http-header-size`) and **Phase 3** (optional middleware / proxy improvements) as in the main plan.
