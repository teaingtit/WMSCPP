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

async function check() {
    try {
        const result = await callTool('query', {
            sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'locations' ORDER BY column_name"
        });
        const columns = JSON.parse(result);
        console.table(columns);
    } catch (err) {
        console.error(err);
    }
}

check();
