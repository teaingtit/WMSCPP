import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const MCP_BRIDGE = 'scripts/call_mcp.mjs';
const MIGRATION_FILE = 'supabase/migrations/001_location_system_redesign.sql';

async function runMigration() {
    console.log(`Reading migration file: ${MIGRATION_FILE}...`);
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

    console.log('Calling MCP to execute migration...');
    const args = JSON.stringify({ sql });

    const child = spawn('node', [MCP_BRIDGE, 'execute_write_operation', args], {
        stdio: 'inherit'
    });

    child.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Migration completed successfully.');
        } else {
            console.error(`❌ Migration failed with exit code ${code}.`);
        }
        process.exit(code);
    });
}

runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
