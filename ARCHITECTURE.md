# System Architecture

## Overview

GemWMS is built on **Next.js 16** using the **App Router** pattern. It leverages **Server Components (RSC)** for data fetching and **Server Actions** for mutations, minimizing client-side JavaScript.

## Core Patterns

### 1. Data Fetching

- **Server Components:** Fetch data directly from Supabase (DB) or internal APIs.
- **No API Routes:** We largely avoid `/api/*` routes for internal data, preferring direct calls in Server Components.
- **Caching:** Utilizes Next.js Data Cache where appropriate (`revalidatePath` for invalidation).

### 2. Mutations

- **Server Actions:** All data modifications (Create, Update, Delete) are handled by Server Actions defined in `src/actions`.
- **Form Handling:** Uses `useFormStatus` and `useActionState` (or similar hooks) for progressive enhancement.
- **Validation:** **Zod** is used to validate all inputs in Server Actions before processing.

### 3. Authentication & Security

- **Supabase Auth:** Handles user sessions.
- **Middleware:** `middleware.ts` protects routes, checking for valid sessions and refreshing tokens.
- **RLS (Row Level Security):** Database policies ensure users only access authorized data. **Server Actions must not bypass RLS** (do not use `service_role` key commonly).

## Directory Structure

```
src/
├── actions/        # Server Actions (mutations, report schedules, etc.)
├── app/            # App Router (Pages & Layouts)
│   ├── (auth)/     # Auth routes (login)
│   ├── api/        # API routes (e.g. /api/health)
│   ├── dashboard/  # Protected routes (warehouses, inventory, inbound, outbound, transfer, audit, history, settings)
│   ├── debug/      # Debug page
│   ├── offline/    # Offline fallback page
│   └── page.tsx    # Landing
├── components/     # React components (ui/, settings/, inbound/, outbound/, etc.)
├── lib/            # Shared utilities
│   ├── db/         # Supabase server/admin helpers (supabase-server.ts, supabase-admin.ts)
│   ├── supabase/   # Supabase client (server, client, admin)
│   ├── offline/    # IndexedDB and offline sync
│   ├── reports/    # Report generation and email templates
│   ├── utils/      # db-helpers, excel-utils
│   ├── validations/# Auth schemas (Zod)
│   ├── action-utils.ts
│   ├── rate-limit.ts
│   └── search-utils.ts
└── types/          # TypeScript interfaces

e2e/                # Playwright E2E tests
test/               # Vitest unit tests (actions/, lib/, components/, database/, hooks/)
```

Schema and migrations may be managed in Supabase (Dashboard or CLI); optional `database/` folder with `schema.sql` / `functions.sql` is used by contract tests if present.

## Testing Strategy

- **Unit Tests (Vitest):** In `test/`. Focus on Server Actions, utility functions, and complex logic. Run with `npm run test:unit` or `npm run test:unit:run`.
- **E2E Tests (Playwright):** In `e2e/`. Test critical user flows (auth, inbound, outbound, transfer, audit, mobile). Run with `npm run test:e2e` or `.\run-e2e.ps1`.
- **Integration Tests:** In `integration/`. Run with `npm run test:integration`.

## Key Design Decisions

- **2.5D Inventory View:** Uses CSS 3D transforms (or Canvas) to visualize warehouse slots, providing better spatial context than a 2D grid.
- **Strict Typing:** TypeScript strict mode is enabled. We avoid `any` where possible.
