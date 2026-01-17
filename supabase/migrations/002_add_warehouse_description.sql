-- Add description column to warehouses table
-- This is needed for the updated warehouse creation form

ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN warehouses.description IS 'Optional description for the warehouse';
