/**
 * Only ever redirect within our own origin. Rejects protocol-relative URLs
 * (`//evil`), backslash tricks (`/\evil`) and absolute URLs to other hosts.
 */
export function safeNextPath(next: unknown, appUrl: string, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.includes("\\")) return fallback;
  try {
    const base = new URL(appUrl);
    const resolved = new URL(next, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
