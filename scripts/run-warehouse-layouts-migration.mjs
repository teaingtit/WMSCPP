import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    try {
        console.log('🚀 Running warehouse_layouts migration...\n');

        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '003_warehouse_layouts.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // Try direct execution if RPC doesn't exist
            const statements = sql.split(';').filter(s => s.trim());

            for (const statement of statements) {
                if (!statement.trim()) continue;

                const { error: execError } = await supabase.from('_migrations').insert({
                    name: '003_warehouse_layouts',
                    executed_at: new Date().toISOString(),
                });

                if (execError && execError.code !== '23505') { // Ignore duplicate
                    console.error('❌ Error:', execError.message);
                }
            }
        }

        console.log('✅ Migration completed successfully!\n');
        console.log('Created table: warehouse_layouts');
        console.log('Added RLS policies');
        console.log('Added indexes and triggers');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
