import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg';
import dotenv from 'dotenv';
import * as process from 'node:process';

dotenv.config();

// 1. Connection Configuration
// Supabase requires SSL connection.
// We strip 'sslmode' from the connection string to ensure our explicit SSL config (rejectUnauthorized: false) is the source of truth.
let connectionString = process.env.DATABASE_URL;
try {
  if (connectionString && connectionString.includes('sslmode=')) {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    connectionString = url.toString();
  }
} catch (error) {
  // If not a valid URL (e.g. keyword string format), fall back to original
  console.error('Failed to parse DATABASE_URL, using as is:', error);
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Necessary for some Supabase setups to avoid self-signed cert errors
  },
});

const server = new Server(
  {
    name: 'official-style-postgres-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

// --- RESOURCES (Schema Inspection) ---
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'postgres://structure/schema',
        name: 'Database Schema',
        mimeType: 'application/json',
        description: 'A comprehensive view of all tables and columns in the public schema',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === 'postgres://structure/schema') {
    const client = await pool.connect();
    try {
      // Official-style query to map tables and columns
      const result = await client.query(`
        SELECT 
          t.table_name,
          json_agg(json_build_object(
            'column', c.column_name,
            'type', c.data_type,
            'nullable', c.is_nullable
          )) as columns
        FROM information_schema.tables t
        JOIN information_schema.columns c 
          ON t.table_name = c.table_name 
          AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
        GROUP BY t.table_name;
      `);

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } finally {
      client.release();
    }
  }
  throw new McpError(ErrorCode.InvalidRequest, 'Resource not found');
});

// --- TOOLS (Direct SQL Execution) ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query',
        description: 'Execute a read-only SQL query (SELECT). Use this to fetch data.',
        inputSchema: {
          type: 'object',
          properties: {
            sql: { type: 'string', description: 'The SQL SELECT statement' },
          },
          required: ['sql'],
        },
      },
      {
        name: 'execute_write_operation',
        description:
          '⚠️ ADMIN: Execute modification queries (INSERT, UPDATE, DELETE, CREATE, DROP). Use with extreme caution.',
        inputSchema: {
          type: 'object',
          properties: {
            sql: { type: 'string', description: 'The SQL modification statement' },
          },
          required: ['sql'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const sql = (args as any).sql;

  if (!sql) {
    throw new McpError(ErrorCode.InvalidParams, 'SQL query is required');
  }

  const client = await pool.connect();

  try {
    if (name === 'query') {
      // Basic safety check for read-only tool
      const upperSql = sql.trim().toUpperCase();
      if (
        !upperSql.startsWith('SELECT') &&
        !upperSql.startsWith('WITH') &&
        !upperSql.startsWith('EXPLAIN')
      ) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "The 'query' tool allows SELECT statements only. Use 'execute_write_operation' for modifications.",
        );
      }

      const result = await client.query(sql);
      return { content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }] };
    }

    if (name === 'execute_write_operation') {
      // Admin tool - logs specifically
      console.error(`[ADMIN AUDIT] Executing Write: ${sql}`);
      const result = await client.query(sql);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'success',
                rowCount: result.rowCount,
                command: result.command,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Database Error: ${error.message}` }],
      isError: true,
    };
  } finally {
    client.release();
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🐘 Postgres MCP Server (Official Style) running on stdio');
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
