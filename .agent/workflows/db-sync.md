---
description: Sync Supabase types and pull schema updates
---

1. Log in to Supabase (if not already): `npx supabase login`
2. Generate types: `npx supabase gen types typescript --project-id wpufstdvknzrrsvmcgwu --schema public > src/types/supabase.ts`
3. Format: `npx prettier --write src/types/supabase.ts`
