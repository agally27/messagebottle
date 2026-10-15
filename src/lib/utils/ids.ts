import { randomBytes, randomUUID, createHmac, timingSafeEqual } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

/** 32 random bytes, base64url → 43 chars, ~256 bits of entropy. Used for public gift links. */
export function newPublicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isPlausibleToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function hmacSign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function hmacVerify(secret: string, payload: string, signature: string): boolean {
  const expected = Buffer.from(hmacSign(secret, payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
