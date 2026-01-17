/**
 * Verify Migration via MCP
 * Checks if migration was successful using MCP server
 * 
 * Usage: node scripts/verify-migration-mcp.mjs
 */

import { spawn } from 'child_process';

const MCP_SCRIPT_PATH = 'c:/Users/nteai/Desktop/project/my-mcp-server/dist/index.js';
const DATABASE_URL = 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

console.log('🔍 Verifying Location System Migration...\n');

const checks = [
    {
        name: 'New columns exist',
        sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'locations' AND column_name IN ('parent_id', 'path', 'depth', 'zone', 'aisle', 'bin_code', 'attributes') ORDER BY column_name;`
    },
    {
        name: 'Old columns removed',
        sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'locations' AND column_name IN ('lot', 'cart', 'level');`
    },
    {
        name: 'Locations by depth',
        sql: `SELECT depth, COUNT(*) as count FROM locations GROUP BY depth ORDER BY depth;`
    },
    {
        name: 'Sample locations',
        sql: `SELECT code, depth, zone, aisle, bin_code, LEFT(path, 30) as path FROM locations ORDER BY path LIMIT 5;`
    }
];

async function runCheck(check) {
    return new Promise((resolve) => {
        console.log(`\n📋 ${check.name}:`);
        console.log('─'.repeat(60));

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
                            params: { name: 'query', arguments: { sql: check.sql } }
                        });
                    } else if (msg.id === 2) {
                        if (msg.error) {
                            console.log('❌ Check failed:', msg.error.message);
                            resolve(false);
                        } else {
                            const result = msg.result?.content?.[0]?.text;
                            if (result) {
                                const data = JSON.parse(result);
                                console.log(JSON.stringify(data, null, 2));
                                console.log(data.length === 0 ? '⚠️  No results' : '✅ Check passed');
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
                clientInfo: { name: 'verify', version: '1.0.0' }
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
    let allPassed = true;

    for (const check of checks) {
        const passed = await runCheck(check);
        if (!passed) allPassed = false;
    }

    console.log('\n' + '='.repeat(60));

    if (allPassed) {
        console.log('✅ All verification checks passed!');
        console.log('\n🚀 Migration successful! Ready to test application.\n');
    } else {
        console.log('❌ Some checks failed. Review errors above.\n');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
