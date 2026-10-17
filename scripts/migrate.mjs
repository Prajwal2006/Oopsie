// Applies SQL files in /migrations in order, once each.
// Uses the direct (unpooled) connection, as recommended for schema changes on Neon.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

// `--ci` (used by `vercel-build`): only production builds with a database configured
// migrate. Previews and database-less builds just build (set MIGRATE_PREVIEWS=1 to opt in).
if (
  process.argv.includes("--ci") &&
  (!connectionString ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" && !process.env.MIGRATE_PREVIEWS))
) {
  console.log("migrate: skipped (no database configured, or non-production deploy)");
  process.exit(0);
}

if (!connectionString) {
  console.error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is not set.");
  process.exit(1);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const client = new pg.Client({
  connectionString: connectionString.replace(/sslmode=(require|prefer|verify-ca)/, "sslmode=verify-full"),
});
await client.connect();

try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file}`);
      continue;
    }
    const sql = await readFile(path.join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`apply  ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
  console.log("migrations up to date");
} finally {
  await client.end();
}
