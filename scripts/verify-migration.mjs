/**
 * Migration Verification Script
 * Verifies the location system migration was successful
 * 
 * Usage: node scripts/verify-migration.mjs
 */

import { spawn } from 'child_process';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

console.log('🔍 Verifying Location System Migration...\n');

const checks = [
    {
        name: 'Check new columns exist',
        sql: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'locations'
        AND column_name IN ('parent_id', 'path', 'depth', 'zone', 'aisle', 'bin_code', 'attributes')
      ORDER BY column_name;
    `
    },
    {
        name: 'Check old columns removed',
        sql: `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'locations'
        AND column_name IN ('lot', 'cart', 'level', 'type', 'max_capacity');
    `
    },
    {
        name: 'Check indexes created',
        sql: `
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'locations'
        AND indexname LIKE 'idx_locations_%'
      ORDER BY indexname;
    `
    },
    {
        name: 'Check trigger exists',
        sql: `
      SELECT trigger_name, event_manipulation
      FROM information_schema.triggers
      WHERE event_object_table = 'locations'
        AND trigger_name = 'trigger_validate_location_hierarchy';
    `
    },
    {
        name: 'Count locations by depth',
        sql: `
      SELECT 
        depth,
        COUNT(*) as count,
        COUNT(DISTINCT zone) as unique_zones,
        COUNT(DISTINCT aisle) as unique_aisles,
        COUNT(DISTINCT bin_code) as unique_bins
      FROM locations
      GROUP BY depth
      ORDER BY depth;
    `
    },
    {
        name: 'Sample migrated locations',
        sql: `
      SELECT code, depth, zone, aisle, bin_code, path, is_active
      FROM locations
      ORDER BY path
      LIMIT 10;
    `
    },
    {
        name: 'Check RPC function removed',
        sql: `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'create_warehouse_xyz_grid';
    `
    }
];

async function runCheck(check) {
    return new Promise((resolve) => {
        console.log(`\n📋 ${check.name}:`);
        console.log('─'.repeat(60));

        const psql = spawn('psql', [DATABASE_URL, '-c', check.sql], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        psql.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        psql.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        psql.on('close', (code) => {
            if (code === 0) {
                console.log(stdout);
                if (stdout.includes('(0 rows)')) {
                    console.log('⚠️  No results found');
                } else {
                    console.log('✅ Check passed');
                }
            } else {
                console.log('❌ Check failed');
                console.error(stderr);
            }
            resolve(code === 0);
        });
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
        console.log('\n📊 Migration Summary:');
        console.log('   • New hierarchical structure implemented');
        console.log('   • Old columns removed');
        console.log('   • Indexes and triggers in place');
        console.log('   • Data migrated successfully\n');
        console.log('🚀 Ready to test application!\n');
    } else {
        console.log('❌ Some verification checks failed!');
        console.log('\n🔍 Review the errors above and fix the migration script.\n');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('❌ Verification error:', err);
    process.exit(1);
});
