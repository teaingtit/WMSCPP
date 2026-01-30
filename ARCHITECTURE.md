# System Architecture

## Overview

GemWMS is built on **Next.js 16** using the **App Router** pattern. It leverages **Server Server Components (RSC)** for data fetching and **Server Actions** for mutations, minimizing client-side JavaScript.

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
├── actions/        # Server Actions (Mutations)
├── app/            # App Router (Pages & Layouts)
│   ├── (auth)/     # Auth routes (login, forgot-password)
│   └── dashboard/  # Protected application routes
├── components/     # React Components
│   ├── ui/         # Reusable UI elements (Buttons, Inputs)
│   └── [feature]/  # Feature-specific components
├── lib/            # Shared utilities
│   ├── db/         # Database helpers (Pool, etc.)
│   └── supabase/   # Supabase client instantiation
└── types/          # TypeScript interfaces/types
```

## Testing Strategy

- **Unit Tests (Vitest):** Focus on Server Actions, Utility functions, and complex logic free of UI.
- **E2E Tests (Playwright):** Test critical user flows (Login -> Inbound -> Outbound).

## Key Design Decisions

- **2.5D Inventory View:** Uses CSS 3D transforms (or Canvas) to visualize warehouse slots, providing better spatial context than a 2D grid.
- **Strict Typing:** TypeScript strict mode is enabled. We avoid `any` where possible.
