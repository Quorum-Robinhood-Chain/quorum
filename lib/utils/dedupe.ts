import { createHash } from "node:crypto";

/** Stable key so the same story (even re-fetched with slightly different excerpt text) isn't stored twice. */
export function dedupeKeyFor(title: string, url: string): string {
  const normalizedTitle = title.trim().toLowerCase().replace(/\s+/g, " ");
  const normalizedUrl = url.trim().toLowerCase().replace(/[?#].*$/, "");
  return createHash("sha256").update(`${normalizedTitle}|${normalizedUrl}`).digest("hex");
}
