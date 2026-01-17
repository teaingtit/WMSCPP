/**
 * Check Database Schema
 * Verifies actual column names in warehouses and locations tables
 * 
 * Usage: node scripts/check-schema.mjs
 */

import { spawn } from 'child_process';

const MCP_SCRIPT_PATH = 'c:/Users/nteai/Desktop/project/my-mcp-server/dist/index.js';
const DATABASE_URL = 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

console.log('🔍 Checking Database Schema...\n');

const queries = [
    {
        name: 'Warehouses table columns',
        sql: `SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'warehouses' 
          ORDER BY ordinal_position;`
    },
    {
        name: 'Locations table columns',
        sql: `SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'locations' 
          ORDER BY ordinal_position;`
    }
];

async function runQuery(query) {
    return new Promise((resolve) => {
        console.log(`\n📋 ${query.name}:`);
        console.log('─'.repeat(80));

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
                            params: { name: 'query', arguments: { sql: query.sql } }
                        });
                    } else if (msg.id === 2) {
                        if (msg.error) {
                            console.log('❌ Error:', msg.error.message);
                            resolve(false);
                        } else {
                            const result = msg.result?.content?.[0]?.text;
                            if (result) {
                                const data = JSON.parse(result);
                                console.table(data);
                                console.log(`✅ Found ${data.length} columns`);
                            }
                            resolve(true);
                        }
                        child.kill();
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
                clientInfo: { name: 'schema-check', version: '1.0.0' }
            }
        });

        setTimeout(() => {
            console.log('❌ Timeout');
            child.kill();
            resolve(false);
        }, 10000);
    });
}

async function main() {
    for (const query of queries) {
        await runQuery(query);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Schema check complete!\n');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
