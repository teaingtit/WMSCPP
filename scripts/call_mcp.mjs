/**
 * MCP Client Bridge
 * Usage: node scripts/call-mcp.mjs <tool_name> [json_args]
 */

import { spawn } from 'child_process';

const MCP_SCRIPT_PATH = 'c:/Users/nteai/Desktop/project/my-mcp-server/dist/index.js';
const DATABASE_URL = 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

const toolName = process.argv[2];
const toolArgs = process.argv[3] ? JSON.parse(process.argv[3]) : {};

if (!toolName) {
    console.error("Usage: node call-mcp.mjs <tool_name> [json_args]");
    process.exit(1);
}

const child = spawn('node', [MCP_SCRIPT_PATH], {
    env: { ...process.env, DATABASE_URL },
    stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let isInitialized = false;

// Helper to send JSON-RPC
const send = (msg) => {
    const str = JSON.stringify(msg) + '\n';
    child.stdin.write(str);
};

// 1. Listen to Stderr (Debug Logs from MCP)
child.stderr.on('data', (data) => {
    // Pass through stderr so we can see what's happening
    const log = data.toString();
    if (log.trim().length > 0) {
        console.error(`[MCP LOG]: ${log.trim()}`);
    }
});

// 2. Listen to Stdout (Protocol Messages)
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
                    params: {
                        name: toolName,
                        arguments: toolArgs
                    }
                });
            }
            else if (msg.id === 2) {
                // !!! IMPORTANT: Kill child process immediately !!!
                child.kill();

                if (msg.error) {
                    console.error('Tool Error:', JSON.stringify(msg.error, null, 2));
                    process.exit(1);
                } else {
                    if (msg.result && msg.result.content && msg.result.content[0]) {
                        console.log(msg.result.content[0].text);
                    } else {
                        console.log(JSON.stringify(msg.result, null, 2));
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

// Start Protocol
send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'mcp-cli-bridge', version: '1.0.0' }
    }
});

// Safety Timeout (5 Seconds)
setTimeout(() => {
    console.error('❌ Timeout waiting for MCP response (5s limit)');
    child.kill();
    process.exit(1);
}, 5000);
