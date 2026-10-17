import "server-only";
import { headers } from "next/headers";
import { query } from "./db";
import { sha256 } from "./tokens";

/** Hashed client identifier. Raw IPs are never stored. */
export async function clientKey() {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return sha256(`oopsie:${process.env.RATE_LIMIT_SALT ?? ""}:${ip}`).slice(0, 32);
}

/**
 * Fixed-window counter in Postgres, so limits hold across serverless instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number) {
  const key = `${bucket}:${await clientKey()}`;
  const rows = await query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count)
     VALUES ($1, to_timestamp(floor(extract(epoch FROM now()) / $2) * $2), 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [key, windowSeconds],
  );
  return rows[0].count <= limit;
}
