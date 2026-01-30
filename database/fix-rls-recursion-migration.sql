-- Run this in Supabase SQL Editor to fix infinite recursion (42P17) on existing projects.
-- Creates is_admin() and is_admin_or_manager(), then replaces affected RLS policies.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'); $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager')); $$;

DROP POLICY IF EXISTS "Admin can manage user roles" ON user_roles;
CREATE POLICY "Admin can manage user roles" ON user_roles FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin/Manager can manage warehouses" ON warehouses;
CREATE POLICY "Admin/Manager can manage warehouses" ON warehouses FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/Manager can manage locations" ON locations;
CREATE POLICY "Admin/Manager can manage locations" ON locations FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin/Manager can manage products" ON products;
CREATE POLICY "Admin/Manager can manage products" ON products FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin can manage categories" ON product_categories;
CREATE POLICY "Admin can manage categories" ON product_categories FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage schema versions" ON category_schema_versions;
CREATE POLICY "Admin can manage schema versions" ON category_schema_versions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin/Manager can manage audit sessions" ON audit_sessions;
CREATE POLICY "Admin/Manager can manage audit sessions" ON audit_sessions FOR ALL USING (public.is_admin_or_manager());

DROP POLICY IF EXISTS "Admin can manage status definitions" ON status_definitions;
CREATE POLICY "Admin can manage status definitions" ON status_definitions FOR ALL USING (public.is_admin());
