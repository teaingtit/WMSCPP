/**
 * Test Location Creation Script
 * Creates sample hierarchical locations to test the new system
 * 
 * Usage: node scripts/test-location-creation.mjs
 */

import { spawn } from 'child_process';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

console.log('🧪 Testing Location Creation...\n');

const testSQL = `
BEGIN;

-- Get a warehouse ID (use first active warehouse)
DO $$
DECLARE
  v_warehouse_id UUID;
  v_zone_a_id UUID;
  v_zone_b_id UUID;
  v_aisle_a1_id UUID;
  v_aisle_a2_id UUID;
  v_aisle_b1_id UUID;
BEGIN
  -- Get warehouse
  SELECT id INTO v_warehouse_id FROM warehouses WHERE is_active = true LIMIT 1;
  
  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'No active warehouse found';
  END IF;
  
  RAISE NOTICE 'Using warehouse: %', v_warehouse_id;
  
  -- Create Zone A
  INSERT INTO locations (warehouse_id, code, zone, depth, description, is_active)
  VALUES (v_warehouse_id, 'ZONE-A', 'A', 0, 'Main Storage Zone A', true)
  RETURNING id INTO v_zone_a_id;
  RAISE NOTICE 'Created Zone A: %', v_zone_a_id;
  
  -- Create Zone B
  INSERT INTO locations (warehouse_id, code, zone, depth, description, is_active)
  VALUES (v_warehouse_id, 'ZONE-B', 'B', 0, 'Cold Storage Zone B', true)
  RETURNING id INTO v_zone_b_id;
  RAISE NOTICE 'Created Zone B: %', v_zone_b_id;
  
  -- Create Aisle A1 (in Zone A)
  INSERT INTO locations (warehouse_id, parent_id, code, aisle, depth, description, is_active)
  VALUES (v_warehouse_id, v_zone_a_id, 'A-A1', 'A1', 1, 'Aisle 1 in Zone A', true)
  RETURNING id INTO v_aisle_a1_id;
  RAISE NOTICE 'Created Aisle A1: %', v_aisle_a1_id;
  
  -- Create Aisle A2 (in Zone A)
  INSERT INTO locations (warehouse_id, parent_id, code, aisle, depth, description, is_active)
  VALUES (v_warehouse_id, v_zone_a_id, 'A-A2', 'A2', 1, 'Aisle 2 in Zone A', true)
  RETURNING id INTO v_aisle_a2_id;
  RAISE NOTICE 'Created Aisle A2: %', v_aisle_a2_id;
  
  -- Create Aisle B1 (in Zone B)
  INSERT INTO locations (warehouse_id, parent_id, code, aisle, depth, description, is_active)
  VALUES (v_warehouse_id, v_zone_b_id, 'B-B1', 'B1', 1, 'Aisle 1 in Zone B', true)
  RETURNING id INTO v_aisle_b1_id;
  RAISE NOTICE 'Created Aisle B1: %', v_aisle_b1_id;
  
  -- Create Bins in Aisle A1
  INSERT INTO locations (warehouse_id, parent_id, code, bin_code, depth, is_active)
  VALUES 
    (v_warehouse_id, v_aisle_a1_id, 'A-A1-L1', 'L1', 2, true),
    (v_warehouse_id, v_aisle_a1_id, 'A-A1-L2', 'L2', 2, true),
    (v_warehouse_id, v_aisle_a1_id, 'A-A1-L3', 'L3', 2, true);
  RAISE NOTICE 'Created 3 bins in Aisle A1';
  
  -- Create Bins in Aisle A2
  INSERT INTO locations (warehouse_id, parent_id, code, bin_code, depth, is_active)
  VALUES 
    (v_warehouse_id, v_aisle_a2_id, 'A-A2-L1', 'L1', 2, true),
    (v_warehouse_id, v_aisle_a2_id, 'A-A2-L2', 'L2', 2, true);
  RAISE NOTICE 'Created 2 bins in Aisle A2';
  
  -- Create Bins in Aisle B1
  INSERT INTO locations (warehouse_id, parent_id, code, bin_code, depth, is_active)
  VALUES 
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L1', 'L1', 2, true),
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L2', 'L2', 2, true),
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L3', 'L3', 2, true),
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L4', 'L4', 2, true);
  RAISE NOTICE 'Created 4 bins in Aisle B1';
  
END $$;

-- Show created hierarchy
SELECT 
  CASE depth
    WHEN 0 THEN '📦 Zone'
    WHEN 1 THEN '  📂 Aisle'
    WHEN 2 THEN '    📍 Bin'
  END as type,
  code,
  zone,
  aisle,
  bin_code,
  path,
  description
FROM locations
WHERE warehouse_id = (SELECT id FROM warehouses WHERE is_active = true LIMIT 1)
ORDER BY path;

COMMIT;
`;

console.log('Creating test location hierarchy...\n');

const psql = spawn('psql', [DATABASE_URL, '-c', testSQL], {
    stdio: ['inherit', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

psql.stdout.on('data', (data) => {
    const output = data.toString();
    stdout += output;
    process.stdout.write(output);
});

psql.stderr.on('data', (data) => {
    const output = data.toString();
    stderr += output;
    // Show notices but not as errors
    if (output.includes('NOTICE')) {
        process.stdout.write('ℹ️  ' + output);
    } else {
        process.stderr.write(output);
    }
});

psql.on('close', (code) => {
    console.log('\n' + '='.repeat(60));

    if (code === 0) {
        console.log('✅ Test locations created successfully!');
        console.log('\n📊 Created:');
        console.log('   • 2 Zones (A, B)');
        console.log('   • 3 Aisles (A1, A2, B1)');
        console.log('   • 9 Bins (3+2+4)');
        console.log('\n🎯 Test the application with these locations!\n');
    } else {
        console.log('❌ Failed to create test locations');
        console.log('\n🔍 Check the error messages above.\n');
    }

    process.exit(code);
});
