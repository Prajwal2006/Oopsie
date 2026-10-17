import "server-only";
import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Neon skill guidance for Vercel: node-postgres + Fluid compute, with the pool
// attached so idle clients are released before the function suspends.
// DATABASE_URL is the pooled (-pooler) connection string.

function normalize(url: string) {
  // pg treats sslmode=require as verify-full already; say so explicitly to
  // keep that behaviour (and silence the deprecation warning).
  return url.replace(/sslmode=(require|prefer|verify-ca)/, "sslmode=verify-full");
}

const globalForPool = globalThis as unknown as { oopsiePool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: normalize(connectionString),
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000, // allows for Neon scale-to-zero cold starts
  });
  attachDatabasePool(pool);
  return pool;
}

export function getPool(): Pool {
  if (!globalForPool.oopsiePool) globalForPool.oopsiePool = createPool();
  return globalForPool.oopsiePool;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
