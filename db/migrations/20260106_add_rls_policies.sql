-- Migration: Add RLS policies for transfer/outbound tables
-- Created: 2026-01-06

BEGIN;

-- Enable RLS on tables
ALTER TABLE IF EXISTS public.transfer_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservations ENABLE ROW LEVEL SECURITY;

-- Policies for transfer_batches: allow users to manage their own batches
CREATE POLICY IF NOT EXISTS transfer_batches_insert_owner ON public.transfer_batches
  FOR INSERT WITH CHECK (created_by::text = auth.uid());

CREATE POLICY IF NOT EXISTS transfer_batches_select_owner ON public.transfer_batches
  FOR SELECT USING (created_by::text = auth.uid());

CREATE POLICY IF NOT EXISTS transfer_batches_update_owner ON public.transfer_batches
  FOR UPDATE USING (created_by::text = auth.uid());

CREATE POLICY IF NOT EXISTS transfer_batches_delete_owner ON public.transfer_batches
  FOR DELETE USING (created_by::text = auth.uid());

-- Policies for transfer_items: allow access only when linked batch belongs to user
CREATE POLICY IF NOT EXISTS transfer_items_select_batch_owner ON public.transfer_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transfer_batches b WHERE b.id = public.transfer_items.batch_id AND b.created_by::text = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS transfer_items_insert_batch_owner ON public.transfer_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transfer_batches b WHERE b.id = public.transfer_items.batch_id AND b.created_by::text = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS transfer_items_update_batch_owner ON public.transfer_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.transfer_batches b WHERE b.id = public.transfer_items.batch_id AND b.created_by::text = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS transfer_items_delete_batch_owner ON public.transfer_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.transfer_batches b WHERE b.id = public.transfer_items.batch_id AND b.created_by::text = auth.uid()
    )
  );

-- Policies for reservations: allow user access when reservation references user's batch or has no reference
CREATE POLICY IF NOT EXISTS reservations_select_owner ON public.reservations
  FOR SELECT USING (
    reference_id IS NULL OR EXISTS (
      SELECT 1 FROM public.transfer_batches b WHERE b.id = public.reservations.reference_id AND b.created_by::text = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS reservations_insert_owner ON public.reservations
  FOR INSERT WITH CHECK (
    reference_id IS NULL OR EXISTS (
      SELECT 1 FROM public.transfer_batches b WHERE b.id = public.reservations.reference_id AND b.created_by::text = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS reservations_delete_owner ON public.reservations
  FOR DELETE USING (
    reference_id IS NULL OR EXISTS (
      SELECT 1 FROM public.transfer_batches b WHERE b.id = public.reservations.reference_id AND b.created_by::text = auth.uid()
    )
  );

COMMIT;

-- Notes:
-- - These policies restrict client access so authenticated users only see and modify batches/items/reservations
--   that they created. Server-side processes using the Supabase service_role key bypass RLS.
-- - You may want to add additional policies for warehouse-level roles or admin roles.
