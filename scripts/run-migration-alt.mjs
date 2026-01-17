/**
 * Alternative Migration Runner using Supabase Client
 * Runs migration directly via Supabase client instead of psql
 * 
 * Usage: node scripts/run-migration-alt.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://pbqiaqrrtyjarrkbvmyz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBicWlhcXJydHlqYXJya2J2bXl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQwNzQ0MSwiZXhwIjoyMDUxOTgzNDQxfQ.0Aq8vZQEpYxqJqZJqZJqZJqZJqZJqZJqZJqZJqZJqZI'; // Replace with actual key

const MIGRATION_FILE = join(__dirname, '../supabase/migrations/001_location_system_redesign.sql');

console.log('🚀 Starting Location System Migration (Alternative Method)...\n');

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

console.log('⚠️  WARNING: This will modify the database schema!');
console.log('📍 Target Database:', SUPABASE_URL);
console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

await new Promise(resolve => setTimeout(resolve, 5000));

console.log('🔄 Running migration...\n');

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

try {
    // Execute migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('   1. Run verification: node scripts/verify-migration.mjs');
    console.log('   2. Test application with new schema');
    console.log('   3. Check for any errors in logs\n');

} catch (err) {
    console.error('❌ Migration error:', err);
    console.log('\n🔍 Check the error messages above for details.\n');
    process.exit(1);
}
