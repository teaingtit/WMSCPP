---
description: Sync Supabase types and pull schema updates
---

1. Login to Supabase (if not already)
2. npx supabase login

3. Generate Types
   // turbo
4. npx supabase gen types typescript --project-id wpufstdvknzrrsvmcgwu --schema public > src/types/supabase.ts

5. Format the generated file
   // turbo
6. npx prettier --write src/types/supabase.ts
