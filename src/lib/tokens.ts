import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** 12-char URL-safe slug (72 bits of randomness): short but unguessable. */
export function newSlug() {
  return randomBytes(9).toString("base64url");
}

/** 256-bit manage token. Only its hash is stored. */
export function newManageToken() {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export const SLUG_RE = /^[A-Za-z0-9_-]{12}$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
