/**
 * Supabase Database Utility Script
 * ================================
 * A comprehensive CLI tool for managing Supabase/PostgreSQL database
 * 
 * Usage:
 *   npx ts-node db-utils.ts <command> [options]
 * 
 * Commands:
 *   schema              - Show all tables and their structure
 *   tables              - List all tables
 *   describe <table>    - Show table structure
 *   query <sql>         - Run a SELECT query
 *   exec <sql>          - Execute any SQL (INSERT/UPDATE/DELETE/etc)
 *   insert <table>      - Interactive insert into table
 *   count <table>       - Count rows in table
 *   sample <table> [n]  - Get sample rows from table (default: 10)
 *   help                - Show this help message
 */

import 'dotenv/config';
import pg from 'pg';
import * as readline from 'readline';

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL ||
    'postgresql://postgres:Pj-468278963@db.pbqiaqrrtyjarrkbvmyz.supabase.co:5432/postgres?sslmode=require';

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ============================================
// SCHEMA OPERATIONS
// ============================================

/**
 * Get all tables in the database
 */
async function listTables(): Promise<string[]> {
    const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
    return result.rows.map(row => row.table_name);
}

/**
 * Get table structure (columns, types, constraints)
 */
async function describeTable(tableName: string): Promise<void> {
    const result = await pool.query(`
    SELECT 
      c.column_name,
      c.data_type,
      c.character_maximum_length,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END as is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
      WHERE tc.table_name = $1 
        AND tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.column_name = pk.column_name
    WHERE c.table_name = $1 
      AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
  `, [tableName]);

    console.log(`\n📋 Table: ${tableName}`);
    console.log('─'.repeat(80));
    console.log(
        'Column'.padEnd(25) +
        'Type'.padEnd(20) +
        'Nullable'.padEnd(10) +
        'PK'.padEnd(5) +
        'Default'
    );
    console.log('─'.repeat(80));

    for (const row of result.rows) {
        let dataType = row.data_type;
        if (row.character_maximum_length) {
            dataType += `(${row.character_maximum_length})`;
        }
        console.log(
            row.column_name.padEnd(25) +
            dataType.padEnd(20) +
            row.is_nullable.padEnd(10) +
            row.is_primary_key.padEnd(5) +
            (row.column_default || '-')
        );
    }
    console.log('');
}

/**
 * Show full schema (all tables with their columns)
 */
async function showSchema(): Promise<void> {
    const tables = await listTables();
    console.log(`\n🗄️  Database Schema (${tables.length} tables)\n`);

    for (const table of tables) {
        await describeTable(table);
    }
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Execute a SELECT query and display results
 */
async function executeQuery(sql: string): Promise<any[]> {
    const result = await pool.query(sql);
    return result.rows;
}

/**
 * Execute any SQL statement (INSERT, UPDATE, DELETE, CREATE, etc)
 */
async function executeSql(sql: string): Promise<{ rowCount: number; rows: any[] }> {
    const result = await pool.query(sql);
    return { rowCount: result.rowCount || 0, rows: result.rows };
}

/**
 * Count rows in a table
 */
async function countRows(tableName: string): Promise<number> {
    const result = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    return parseInt(result.rows[0].count);
}

/**
 * Get sample rows from a table
 */
async function sampleRows(tableName: string, limit: number = 10): Promise<any[]> {
    const result = await pool.query(`SELECT * FROM "${tableName}" LIMIT $1`, [limit]);
    return result.rows;
}

// ============================================
// DATA MANIPULATION
// ============================================

/**
 * Insert data into a table
 */
async function insertRow(tableName: string, data: Record<string, any>): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) 
               VALUES (${placeholders}) RETURNING *`;

    const result = await pool.query(sql, values);
    return result.rows[0];
}

/**
 * Update rows in a table
 */
async function updateRows(
    tableName: string,
    data: Record<string, any>,
    whereClause: string
): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');

    const sql = `UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause}`;
    const result = await pool.query(sql, values);
    return result.rowCount || 0;
}

/**
 * Delete rows from a table
 */
async function deleteRows(tableName: string, whereClause: string): Promise<number> {
    const sql = `DELETE FROM "${tableName}" WHERE ${whereClause}`;
    const result = await pool.query(sql);
    return result.rowCount || 0;
}

// ============================================
// TABLE OPERATIONS
// ============================================

/**
 * Create a new table
 */
async function createTable(tableName: string, columns: string): Promise<void> {
    const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columns})`;
    await pool.query(sql);
    console.log(`✅ Table "${tableName}" created successfully`);
}

/**
 * Drop a table
 */
async function dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS "${tableName}" CASCADE`;
    await pool.query(sql);
    console.log(`🗑️  Table "${tableName}" dropped successfully`);
}

// ============================================
// INTERACTIVE MODE
// ============================================

async function interactiveMode(): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n🔌 Connected to Supabase Database');
    console.log('Type SQL commands or use these shortcuts:');
    console.log('  \\dt          - List tables');
    console.log('  \\d <table>   - Describe table');
    console.log('  \\q           - Quit');
    console.log('─'.repeat(50));

    const prompt = () => {
        rl.question('supabase> ', async (input) => {
            const cmd = input.trim();

            if (!cmd) {
                prompt();
                return;
            }

            try {
                if (cmd === '\\q' || cmd === 'exit' || cmd === 'quit') {
                    console.log('Goodbye! 👋');
                    rl.close();
                    await pool.end();
                    return;
                }

                if (cmd === '\\dt') {
                    const tables = await listTables();
                    console.log('\n📋 Tables:');
                    tables.forEach(t => console.log(`  • ${t}`));
                    console.log('');
                } else if (cmd.startsWith('\\d ')) {
                    const tableName = cmd.slice(3).trim();
                    await describeTable(tableName);
                } else {
                    // Execute as SQL
                    const result = await pool.query(cmd);
                    if (result.rows.length > 0) {
                        console.table(result.rows);
                    } else {
                        console.log(`✅ Query executed. Rows affected: ${result.rowCount}`);
                    }
                }
            } catch (error: any) {
                console.error(`❌ Error: ${error.message}`);
            }

            prompt();
        });
    };

    prompt();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function printHelp(): void {
    console.log(`
🔧 Supabase Database Utility
============================

Usage: npx ts-node db-utils.ts <command> [options]

Commands:
  schema              Show all tables and their structure
  tables              List all tables
  describe <table>    Show table structure
  query "<sql>"       Run a SELECT query
  exec "<sql>"        Execute any SQL statement
  count <table>       Count rows in table
  sample <table> [n]  Get sample rows (default: 10)
  interactive         Start interactive SQL mode
  help                Show this help message

Examples:
  npx ts-node db-utils.ts tables
  npx ts-node db-utils.ts describe users
  npx ts-node db-utils.ts query "SELECT * FROM users LIMIT 5"
  npx ts-node db-utils.ts count orders
  npx ts-node db-utils.ts interactive
`);
}

function formatOutput(rows: any[]): void {
    if (rows.length === 0) {
        console.log('(No rows returned)');
        return;
    }
    console.table(rows);
    console.log(`(${rows.length} rows)`);
}

// ============================================
// MAIN CLI
// ============================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase();

    if (!command || command === 'help') {
        printHelp();
        await pool.end();
        return;
    }

    try {
        switch (command) {
            case 'schema':
                await showSchema();
                break;

            case 'tables':
                const tables = await listTables();
                console.log('\n📋 Tables in database:');
                tables.forEach(t => console.log(`  • ${t}`));
                console.log(`\nTotal: ${tables.length} tables\n`);
                break;

            case 'describe':
            case 'desc':
                if (!args[1]) {
                    console.error('❌ Please specify a table name');
                    break;
                }
                await describeTable(args[1]);
                break;

            case 'query':
                if (!args[1]) {
                    console.error('❌ Please provide a SQL query');
                    break;
                }
                const queryResult = await executeQuery(args.slice(1).join(' '));
                formatOutput(queryResult);
                break;

            case 'exec':
                if (!args[1]) {
                    console.error('❌ Please provide a SQL statement');
                    break;
                }
                const execResult = await executeSql(args.slice(1).join(' '));
                console.log(`✅ Executed. Rows affected: ${execResult.rowCount}`);
                if (execResult.rows.length > 0) {
                    formatOutput(execResult.rows);
                }
                break;

            case 'count':
                if (!args[1]) {
                    console.error('❌ Please specify a table name');
                    break;
                }
                const count = await countRows(args[1]);
                console.log(`\n📊 Table "${args[1]}" has ${count} rows\n`);
                break;

            case 'sample':
                if (!args[1]) {
                    console.error('❌ Please specify a table name');
                    break;
                }
                const limit = parseInt(args[2] ?? '10') || 10;
                const sample = await sampleRows(args[1]!, limit);
                console.log(`\n📋 Sample from "${args[1]}" (${limit} rows):`);
                formatOutput(sample);
                break;

            case 'interactive':
            case 'i':
                await interactiveMode();
                return; // Don't close pool here, interactive mode handles it

            default:
                console.error(`❌ Unknown command: ${command}`);
                printHelp();
        }
    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
    }

    await pool.end();
}

// Export functions for programmatic use
export {
    listTables,
    describeTable,
    showSchema,
    executeQuery,
    executeSql,
    countRows,
    sampleRows,
    insertRow,
    updateRows,
    deleteRows,
    createTable,
    dropTable,
    pool
};

// Run CLI if executed directly
main().catch(console.error);
