/**
 * Quick Fix: Add warehouse description column
 * Usage: node scripts/add-warehouse-description.mjs
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MCP_SCRIPT_PATH = 'c:/Users/nteai/Desktop/project/my-mcp-server/dist/index.js';
const DATABASE_URL = 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';
const MIGRATION_FILE = join(__dirname, '../supabase/migrations/002_add_warehouse_description.sql');

console.log('🔧 Adding description column to warehouses table...\n');

const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');

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
                    params: { name: 'query', arguments: { sql: migrationSQL } }
                });
            } else if (msg.id === 2) {
                if (msg.error) {
                    console.error('❌ Failed:', msg.error.message);
                    process.exit(1);
                } else {
                    console.log('✅ Column added successfully!');
                    console.log('\n🔄 Please restart the dev server.\n');
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
        clientInfo: { name: 'fix', version: '1.0.0' }
    }
});

setTimeout(() => {
    console.error('❌ Timeout');
    process.exit(1);
}, 10000);
