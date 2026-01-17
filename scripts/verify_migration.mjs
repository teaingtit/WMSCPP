import { spawn } from 'child_process';

const MCP_BRIDGE = 'scripts/call_mcp.mjs';

function callTool(tool, args) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [MCP_BRIDGE, tool, JSON.stringify(args)], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let output = '';
        child.stdout.on('data', data => output += data.toString());
        child.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`Exit code ${code}`));
        });
    });
}

async function verify() {
    try {
        const result = await callTool('query', {
            sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'locations'"
        });
        const columns = JSON.parse(result).map(c => c.column_name);

        const expected = ['parent_id', 'path', 'depth', 'zone', 'aisle', 'bin_code', 'attributes'];
        const unexpected = ['lot', 'cart', 'level', 'type'];

        console.log('--- Verification Results ---');
        expected.forEach(col => {
            console.log(`${col}: ${columns.includes(col) ? '✅ PRESENT' : '❌ MISSING'}`);
        });
        unexpected.forEach(col => {
            console.log(`${col}: ${columns.includes(col) ? '❌ STILL EXISTS' : '✅ DROPPED'}`);
        });

        const migrationCount = await callTool('query', {
            sql: "SELECT depth, COUNT(*) FROM locations GROUP BY depth"
        });
        console.log('\n--- Migration Stats ---');
        console.log(migrationCount);

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
