-- Migration: Create transfer/outbound support tables
-- Created: 2026-01-06

BEGIN;

-- Batch table representing a user-triggered transfer/outbound action
CREATE TABLE IF NOT EXISTS transfer_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('INTERNAL', 'CROSS', 'OUTBOUND')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMMITTED','FAILED','ROLLED_BACK')),
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Items belonging to a batch (one row per stock/line)
CREATE TABLE IF NOT EXISTS transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES transfer_batches(id) ON DELETE CASCADE,
  stock_id uuid NOT NULL,
  qty_requested numeric NOT NULL CHECK (qty_requested > 0),
  qty_reserved numeric DEFAULT 0,
  from_location_id uuid,
  to_location_id uuid,
  target_warehouse_id uuid,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RESERVED','COMPLETED','FAILED')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional lightweight reservations table for optimistic reserving
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL,
  reserved_qty numeric NOT NULL CHECK (reserved_qty > 0),
  reference_id uuid, -- typically transfer_batches.id
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes to support common queries
CREATE INDEX IF NOT EXISTS idx_transfer_items_batch_id ON transfer_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_stock_id ON transfer_items(stock_id);
CREATE INDEX IF NOT EXISTS idx_reservations_stock_id ON reservations(stock_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations(expires_at);

COMMIT;

-- Notes:
-- 1) This migration adds three tables: transfer_batches, transfer_items, reservations.
-- 2) Application logic should create a transfer_batch, insert transfer_items, run preflight checks
--    (optionally create reservations rows), then commit in a transaction to adjust stock counts.
-- 3) Consider adding FK constraints to stocks/locations if you want referential integrity.
