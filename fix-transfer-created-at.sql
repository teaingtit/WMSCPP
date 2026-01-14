-- ========================================
-- Fix Transfer RPC Functions
-- Problem: created_at column doesn't exist in stocks table
-- ========================================

-- Step 1: View current function definitions
-- Run this first to see the current implementation
SELECT pg_get_functiondef('transfer_stock'::regproc);
SELECT pg_get_functiondef('transfer_cross_stock'::regproc);

-- ========================================
-- Option A: Remove created_at from functions
-- ========================================
-- After viewing the functions above, you'll need to:
-- 1. Copy the function definition
-- 2. Remove any reference to 'created_at' column
-- 3. Run DROP FUNCTION and CREATE FUNCTION again

-- Example pattern to look for and remove:
-- INSERT INTO stocks (product_id, location_id, quantity, attributes, created_at)
-- VALUES (..., ..., ..., ..., NOW());
--
-- Change to:
-- INSERT INTO stocks (product_id, location_id, quantity, attributes)
-- VALUES (..., ..., ..., ...);

-- ========================================
-- Option B: Add created_at column to stocks table
-- ========================================
-- If you prefer to add the column instead:

-- Check if column exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stocks' AND column_name = 'created_at'
    ) THEN
        -- Add the column
        ALTER TABLE stocks 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Column created_at added to stocks table';
    ELSE
        RAISE NOTICE 'Column created_at already exists';
    END IF;
END $$;

-- Update existing records (if you added the column)
UPDATE stocks 
SET created_at = NOW() 
WHERE created_at IS NULL;

-- ========================================
-- Verification Query
-- ========================================
-- After applying the fix, test with this query:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stocks' 
ORDER BY ordinal_position;
