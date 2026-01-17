/**
 * Run Migration via MCP
 * Executes migration SQL using the Supabase MCP server
 * 
 * Usage: node scripts/run-migration-mcp.mjs
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MCP_SCRIPT_PATH = 'c:/Users/nteai/Desktop/project/my-mcp-server/dist/index.js';
const DATABASE_URL = 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';
const MIGRATION_FILE = join(__dirname, '../supabase/migrations/001_location_system_redesign.sql');

console.log('🚀 Starting Location System Migration via MCP...\n');

// Read migration file
let migrationSQL;
try {
    migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
    console.log('✅ Migration file loaded');
    console.log(`📄 Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);
} catch (err) {
    console.error('❌ Error reading migration file:', err.message);
    process.exit(1);
}

console.log('⚠️  WARNING: This will modify the database schema!');
console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n');

await new Promise(resolve => setTimeout(resolve, 3000));

console.log('🔄 Running migration...\n');

// Call MCP query tool with migration SQL
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

            // Handle Initialization
            if (msg.id === 1 && !isInitialized) {
                isInitialized = true;
                send({ jsonrpc: '2.0', method: 'notifications/initialized' });

                // Execute migration
                send({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                        name: 'query',
                        arguments: { sql: migrationSQL }
                    }
                });
            }

            // Handle Migration Response
            else if (msg.id === 2) {
                if (msg.error) {
                    console.error('❌ Migration failed:', msg.error.message);
                    process.exit(1);
                } else {
                    console.log('✅ Migration executed successfully!\n');
                    console.log('='.repeat(60));
                    console.log('\n📊 Next steps:');
                    console.log('   1. Run: node scripts/verify-migration-mcp.mjs');
                    console.log('   2. Run: node scripts/test-location-creation.mjs');
                    console.log('   3. Test application: npm run dev\n');
                    process.exit(0);
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
    buffer = lines.join('\n');
});

child.stderr.on('data', (data) => {
    const output = data.toString();
    if (!output.includes('running on stdio')) {
        console.error(output);
    }
});

// Initialize MCP
send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'migration-runner', version: '1.0.0' }
    }
});

// Timeout
setTimeout(() => {
    console.error('❌ Timeout waiting for MCP response');
    process.exit(1);
}, 30000);
