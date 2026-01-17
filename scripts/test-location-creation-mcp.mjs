/**
 * Test Location Creation via MCP
 * Creates sample hierarchical locations using MCP server
 * 
 * Usage: node scripts/test-location-creation-mcp.mjs
 */

import { spawn } from 'child_process';

const MCP_SCRIPT_PATH = 'c:/Users/nteai/Desktop/project/my-mcp-server/dist/index.js';
const DATABASE_URL = 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

console.log('🧪 Creating Test Locations...\n');

const testSQL = `
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
  
  -- Create Zone A
  INSERT INTO locations (warehouse_id, code, zone, depth, description, is_active)
  VALUES (v_warehouse_id, 'ZONE-A', 'A', 0, 'Main Storage Zone A', true)
  RETURNING id INTO v_zone_a_id;
  
  -- Create Zone B
  INSERT INTO locations (warehouse_id, code, zone, depth, description, is_active)
  VALUES (v_warehouse_id, 'ZONE-B', 'B', 0, 'Cold Storage Zone B', true)
  RETURNING id INTO v_zone_b_id;
  
  -- Create Aisle A1
  INSERT INTO locations (warehouse_id, parent_id, code, aisle, depth, description, is_active)
  VALUES (v_warehouse_id, v_zone_a_id, 'A-A1', 'A1', 1, 'Aisle 1 in Zone A', true)
  RETURNING id INTO v_aisle_a1_id;
  
  -- Create Aisle A2
  INSERT INTO locations (warehouse_id, parent_id, code, aisle, depth, description, is_active)
  VALUES (v_warehouse_id, v_zone_a_id, 'A-A2', 'A2', 1, 'Aisle 2 in Zone A', true)
  RETURNING id INTO v_aisle_a2_id;
  
  -- Create Aisle B1
  INSERT INTO locations (warehouse_id, parent_id, code, aisle, depth, description, is_active)
  VALUES (v_warehouse_id, v_zone_b_id, 'B-B1', 'B1', 1, 'Aisle 1 in Zone B', true)
  RETURNING id INTO v_aisle_b1_id;
  
  -- Create Bins in Aisle A1
  INSERT INTO locations (warehouse_id, parent_id, code, bin_code, depth, is_active)
  VALUES 
    (v_warehouse_id, v_aisle_a1_id, 'A-A1-L1', 'L1', 2, true),
    (v_warehouse_id, v_aisle_a1_id, 'A-A1-L2', 'L2', 2, true),
    (v_warehouse_id, v_aisle_a1_id, 'A-A1-L3', 'L3', 2, true);
  
  -- Create Bins in Aisle A2
  INSERT INTO locations (warehouse_id, parent_id, code, bin_code, depth, is_active)
  VALUES 
    (v_warehouse_id, v_aisle_a2_id, 'A-A2-L1', 'L1', 2, true),
    (v_warehouse_id, v_aisle_a2_id, 'A-A2-L2', 'L2', 2, true);
  
  -- Create Bins in Aisle B1
  INSERT INTO locations (warehouse_id, parent_id, code, bin_code, depth, is_active)
  VALUES 
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L1', 'L1', 2, true),
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L2', 'L2', 2, true),
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L3', 'L3', 2, true),
    (v_warehouse_id, v_aisle_b1_id, 'B-B1-L4', 'L4', 2, true);
    
  RAISE NOTICE 'Created test locations successfully';
END $$;

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
  LEFT(path, 40) as path
FROM locations
WHERE warehouse_id = (SELECT id FROM warehouses WHERE is_active = true LIMIT 1)
ORDER BY path;
`;

const child = spawn('node', [MCP_SCRIPT_PATH], {
    env: { ...process.env, DATABASE_URL },
    stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let isInitialized = false;

const send = (msg) => {
    child.stdin.write(JSON.stringify(msg) + '\n');
};

child.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');

    while (lines.length > 1) {
        const line = lines.shift();
        if (!line.trim()) continue;

        try {
            const msg = JSON.parse(line);

            if (msg.id === 1 && !isInitialized) {
                isInitialized = true;
                send({ jsonrpc: '2.0', method: 'notifications/initialized' });
                send({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: { name: 'query', arguments: { sql: testSQL } }
                });
            } else if (msg.id === 2) {
                if (msg.error) {
                    console.error('❌ Failed:', msg.error.message);
                    process.exit(1);
                } else {
                    const result = msg.result?.content?.[0]?.text;
                    if (result) {
                        const data = JSON.parse(result);
                        console.log('\n📊 Created Locations:');
                        console.log('─'.repeat(60));
                        console.table(data);
                        console.log('\n✅ Test locations created successfully!');
                        console.log('\n📊 Summary:');
                        console.log('   • 2 Zones (A, B)');
                        console.log('   • 3 Aisles (A1, A2, B1)');
                        console.log('   • 9 Bins (3+2+4)');
                        console.log('\n🎯 Ready to test application!\n');
                    }
                    process.exit(0);
                }
            }
        } catch (e) {
            // Ignore
        }
    }
    buffer = lines.join('\n');
});

send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-creator', version: '1.0.0' }
    }
});

setTimeout(() => {
    console.error('❌ Timeout');
    process.exit(1);
}, 15000);
