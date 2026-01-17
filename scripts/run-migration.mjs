/**
 * Migration Verification Script
 * Tests the location system migration on development database
 * 
 * Usage: node scripts/run-migration.mjs
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';
const MIGRATION_FILE = join(__dirname, '../supabase/migrations/001_location_system_redesign.sql');

console.log('🚀 Starting Location System Migration...\n');

// Read migration file
let migrationSQL;
try {
    migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
    console.log('✅ Migration file loaded:', MIGRATION_FILE);
    console.log(`📄 File size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);
} catch (err) {
    console.error('❌ Error reading migration file:', err.message);
    process.exit(1);
}

// Confirm before running
console.log('⚠️  WARNING: This will modify the database schema!');
console.log('📍 Target Database:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

await new Promise(resolve => setTimeout(resolve, 5000));

console.log('🔄 Running migration...\n');

// Run migration using psql
const psql = spawn('psql', [DATABASE_URL, '-f', MIGRATION_FILE], {
    stdio: ['inherit', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

psql.stdout.on('data', (data) => {
    const output = data.toString();
    stdout += output;
    process.stdout.write(output);
});

psql.stderr.on('data', (data) => {
    const output = data.toString();
    stderr += output;

    // Filter out notices/warnings that are expected
    if (!output.includes('NOTICE') && !output.includes('does not exist, skipping')) {
        process.stderr.write(output);
    }
});

psql.on('close', (code) => {
    console.log('\n' + '='.repeat(60));

    if (code === 0) {
        console.log('✅ Migration completed successfully!');
        console.log('\n📊 Next steps:');
        console.log('   1. Run verification: node scripts/verify-migration.mjs');
        console.log('   2. Test application with new schema');
        console.log('   3. Check for any errors in logs\n');
    } else {
        console.log('❌ Migration failed with exit code:', code);
        console.log('\n🔍 Check the error messages above for details.');
        console.log('💡 You may need to rollback or fix the migration script.\n');
    }

    process.exit(code);
});
