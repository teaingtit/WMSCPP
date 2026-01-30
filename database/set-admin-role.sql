-- Set role to admin for admin@wma.com (run in Supabase SQL Editor if script fails).
-- Create the user first in Dashboard: Authentication -> Users -> Add user
--   Email: admin@wma.com, Password: adminwms

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@wma.com');
