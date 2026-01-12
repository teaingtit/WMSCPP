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
declare const pool: import("pg").Pool;
/**
 * Get all tables in the database
 */
declare function listTables(): Promise<string[]>;
/**
 * Get table structure (columns, types, constraints)
 */
declare function describeTable(tableName: string): Promise<void>;
/**
 * Show full schema (all tables with their columns)
 */
declare function showSchema(): Promise<void>;
/**
 * Execute a SELECT query and display results
 */
declare function executeQuery(sql: string): Promise<any[]>;
/**
 * Execute any SQL statement (INSERT, UPDATE, DELETE, CREATE, etc)
 */
declare function executeSql(sql: string): Promise<{
    rowCount: number;
    rows: any[];
}>;
/**
 * Count rows in a table
 */
declare function countRows(tableName: string): Promise<number>;
/**
 * Get sample rows from a table
 */
declare function sampleRows(tableName: string, limit?: number): Promise<any[]>;
/**
 * Insert data into a table
 */
declare function insertRow(tableName: string, data: Record<string, any>): Promise<any>;
/**
 * Update rows in a table
 */
declare function updateRows(tableName: string, data: Record<string, any>, whereClause: string): Promise<number>;
/**
 * Delete rows from a table
 */
declare function deleteRows(tableName: string, whereClause: string): Promise<number>;
/**
 * Create a new table
 */
declare function createTable(tableName: string, columns: string): Promise<void>;
/**
 * Drop a table
 */
declare function dropTable(tableName: string): Promise<void>;
export { listTables, describeTable, showSchema, executeQuery, executeSql, countRows, sampleRows, insertRow, updateRows, deleteRows, createTable, dropTable, pool };
//# sourceMappingURL=db-utils.d.ts.map