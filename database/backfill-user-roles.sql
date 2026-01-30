-- Backfill user_roles for auth users that have no role (e.g. created before trigger existed).
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor) with sufficient privileges.
-- Default: role = 'staff', is_active = true, allowed_warehouses = '{}'.

INSERT INTO public.user_roles (user_id, role, is_active, allowed_warehouses)
SELECT au.id, 'staff', true, '{}'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;
