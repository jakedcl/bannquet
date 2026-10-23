import { attachDatabasePool } from '@vercel/functions';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseConnectionString } from '@/db/connection';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: Database | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Database {
  if (database) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  pool = new Pool({ connectionString: databaseConnectionString(connectionString), max: 5 });
  attachDatabasePool(pool);
  database = drizzle(pool, { schema });
  return database;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  database = undefined;
}
