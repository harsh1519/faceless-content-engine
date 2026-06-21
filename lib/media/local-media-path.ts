/**
 * Pure path helpers for `local/…` DB prefixes — safe to import from client components.
 * Node-only I/O lives in `local-storage.ts`.
 */
export const LOCAL_MEDIA_PREFIX = "local/" as const;

export function isLocalMediaPath(dbPath: string | null | undefined): boolean {
  return !!dbPath?.startsWith(LOCAL_MEDIA_PREFIX);
}

export function stripLocalPrefix(dbPath: string): string {
  if (!dbPath.startsWith(LOCAL_MEDIA_PREFIX)) {
    throw new Error("Expected path to start with local/");
  }
  return dbPath.slice(LOCAL_MEDIA_PREFIX.length);
}
