-- =====================================================
-- Location System Redesign Migration
-- Version: 1.0.0
-- Description: Migrate from flat grid structure to hierarchical 3-level system
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

BEGIN;

-- =====================================================
-- STEP 1: Add New Columns to locations table
-- =====================================================

ALTER TABLE locations 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS path TEXT,
  ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0 CHECK (depth BETWEEN 0 AND 2),
  ADD COLUMN IF NOT EXISTS zone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS aisle VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bin_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- STEP 2: Migrate Existing Data (if any)
-- =====================================================

-- Map old structure to new:
-- lot -> zone
-- cart -> aisle  
-- level -> bin_code
-- Assume all existing locations are Bins (depth=2)

DO $$
BEGIN
  -- Only migrate if old columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='locations' AND column_name='lot'
  ) THEN
    
    -- Update existing locations
    UPDATE locations SET 
      zone = COALESCE(lot, ''),
      aisle = COALESCE(cart, ''),
      bin_code = COALESCE(level, ''),
      depth = 2, -- Assume all old locations are Bins
      path = '/' || COALESCE(lot, 'UNKNOWN') || '/' || 
             COALESCE(cart, 'UNKNOWN') || '/' || 
             COALESCE(code, id::text) || '/',
      updated_at = now()
    WHERE lot IS NOT NULL OR cart IS NOT NULL OR level IS NOT NULL;
    
    RAISE NOTICE 'Migrated % existing locations', (SELECT COUNT(*) FROM locations WHERE depth = 2);
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_locations_parent 
  ON locations(parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_path 
  ON locations USING GIST (path gist_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_locations_zone_aisle 
  ON locations(zone, aisle) WHERE zone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_attributes 
  ON locations USING GIN (attributes);

CREATE INDEX IF NOT EXISTS idx_locations_warehouse_depth 
  ON locations(warehouse_id, depth);

-- Unique constraint: code must be unique within warehouse
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_unique_code_per_warehouse 
  ON locations(warehouse_id, code);

-- =====================================================
-- STEP 4: Create Validation Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION validate_location_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Depth 0 (Zone): no parent, must have zone
  IF NEW.depth = 0 THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Zone (depth 0) cannot have parent';
    END IF;
    IF NEW.zone IS NULL OR NEW.zone = '' THEN
      RAISE EXCEPTION 'Zone must have zone code';
    END IF;
    NEW.path = '/' || NEW.zone || '/';
  
  -- Depth 1 (Aisle): parent must be Zone, must have zone+aisle
  ELSIF NEW.depth = 1 THEN
    IF NEW.parent_id IS NULL THEN
      RAISE EXCEPTION 'Aisle (depth 1) must have parent Zone';
    END IF;
    
    -- Get parent info
    SELECT path, zone INTO NEW.path, NEW.zone
    FROM locations WHERE id = NEW.parent_id AND depth = 0;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent must be a Zone (depth 0)';
    END IF;
    
    IF NEW.aisle IS NULL OR NEW.aisle = '' THEN
      RAISE EXCEPTION 'Aisle must have aisle code';
    END IF;
    
    NEW.path = NEW.path || NEW.aisle || '/';
  
  -- Depth 2 (Bin): parent must be Aisle, must have zone+aisle+bin_code
  ELSIF NEW.depth = 2 THEN
    IF NEW.parent_id IS NULL THEN
      RAISE EXCEPTION 'Bin (depth 2) must have parent Aisle';
    END IF;
    
    -- Get parent info
    SELECT path, zone, aisle INTO NEW.path, NEW.zone, NEW.aisle
    FROM locations WHERE id = NEW.parent_id AND depth = 1;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent must be an Aisle (depth 1)';
    END IF;
    
    IF NEW.bin_code IS NULL OR NEW.bin_code = '' THEN
      RAISE EXCEPTION 'Bin must have bin_code';
    END IF;
    
    NEW.path = NEW.path || NEW.bin_code || '/';
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: Attach Trigger
-- =====================================================

DROP TRIGGER IF EXISTS trigger_validate_location_hierarchy ON locations;

CREATE TRIGGER trigger_validate_location_hierarchy
  BEFORE INSERT OR UPDATE OF parent_id, depth, zone, aisle, bin_code ON locations
  FOR EACH ROW EXECUTE FUNCTION validate_location_hierarchy();

-- =====================================================
-- STEP 6: Drop Old Columns (BREAKING CHANGE)
-- =====================================================

-- WARNING: This will break existing code that references these columns
-- Only run after updating all application code

ALTER TABLE locations 
  DROP COLUMN IF EXISTS lot,
  DROP COLUMN IF EXISTS cart,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS max_capacity;

-- =====================================================
-- STEP 7: Drop Old RPC Function (if exists)
-- =====================================================

DROP FUNCTION IF EXISTS create_warehouse_xyz_grid(text, text, int, int, int);

-- =====================================================
-- STEP 8: Add Comment Documentation
-- =====================================================

COMMENT ON COLUMN locations.parent_id IS 'Parent location ID for hierarchical structure';
COMMENT ON COLUMN locations.path IS 'Materialized path for efficient tree queries (e.g., /A/A1/A1-L1/)';
COMMENT ON COLUMN locations.depth IS '0=Zone, 1=Aisle, 2=Bin';
COMMENT ON COLUMN locations.zone IS 'Zone code (e.g., A, B, COLD)';
COMMENT ON COLUMN locations.aisle IS 'Aisle code (e.g., A1, A2)';
COMMENT ON COLUMN locations.bin_code IS 'Bin/Level code (e.g., L1, L2, SHELF-01)';
COMMENT ON COLUMN locations.attributes IS 'Custom metadata and lot-specific data (JSONB)';

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check migration results
SELECT 
  depth,
  COUNT(*) as count,
  COUNT(DISTINCT zone) as unique_zones,
  COUNT(DISTINCT aisle) as unique_aisles
FROM locations
GROUP BY depth
ORDER BY depth;

-- Show sample migrated data
SELECT 
  code,
  depth,
  zone,
  aisle,
  bin_code,
  path
FROM locations
ORDER BY path
LIMIT 10;
