import { spawn } from 'child_process';
import path from 'path';

const MCP_SCRIPT_PATH = 'c:/Users/nteai/Desktop/project/my-mcp-server/dist/index.js';
const DATABASE_URL = 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

console.log('Starting MCP server test...');
console.log(`Script: ${MCP_SCRIPT_PATH}`);

const child = spawn('node', [MCP_SCRIPT_PATH], {
  env: {
    ...process.env,
    DATABASE_URL: DATABASE_URL
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stderr.on('data', (data) => {
  console.log(`[MCP STDERR]: ${data.toString()}`);
});

child.on('error', (err) => {
  console.error('[MCP ERROR]:', err);
});

child.on('exit', (code) => {
  console.log(`[MCP EXIT] code: ${code}`);
});

// Create a simple JSON-RPC initialization message
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-script',
      version: '1.0.0'
    }
  }
};

// Write to stdin
const input = JSON.stringify(initMessage) + '\n';
child.stdin.write(input);

console.log('Sent initialize request. Waiting for response...');

// Buffer for response
let buffer = '';

child.stdout.on('data', (data) => {
  buffer += data.toString();
  console.log(`[MCP STDOUT RAW]: ${data.toString()}`);
  
  // Try to parse JSON lines
  const lines = buffer.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      try {
        const json = JSON.parse(line);
        console.log('[MCP RESPONSE PARSED]:', JSON.stringify(json, null, 2));
        
        // If we got a result for id 1, verification successful!
        if (json.id === 1) {
          console.log('✅ verification SUCCESS!');
          child.kill();
          process.exit(0);
        }
      } catch (e) {
        // partial line, ignore
      }
    }
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('❌ Timeout waiting for response.');
  child.kill();
  process.exit(1);
}, 10000);
