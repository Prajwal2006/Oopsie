import "server-only";
import { z } from "zod";
import { UserFacingError } from "./apologies";
import { firstIssue } from "./validation";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function error(code: string, message: string, status = 400) {
  return json({ error: code, message }, status);
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false as const, response: error("bad_json", "Request body must be JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, response: error("invalid", firstIssue(parsed.error)) };
  }
  return { ok: true as const, data: parsed.data as z.infer<T> };
}

/** Converts known errors to friendly responses; logs only the error code, never user content. */
export function handleError(err: unknown) {
  if (err instanceof UserFacingError) return error(err.code, err.message, err.status);
  const code = (err as { code?: string })?.code;
  console.error("oopsie: unexpected error", code ?? (err as Error)?.name ?? "unknown");
  return error("server_error", "Something went oopsie on our side. Please try again.", 500);
}

export const tooMany = () => error("rate_limited", "Whoa, slow down a little! Try again in a minute.", 429);
