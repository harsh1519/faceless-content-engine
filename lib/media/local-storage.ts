import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  LOCAL_MEDIA_PREFIX,
  isLocalMediaPath,
  stripLocalPrefix,
} from "@/lib/media/local-media-path";

export { LOCAL_MEDIA_PREFIX, isLocalMediaPath, stripLocalPrefix };

/** Absolute root for on-disk media when using local storage (no Supabase Storage for blobs). */
export function getLocalMediaRoot(): string | null {
  const root = process.env.LOCAL_MEDIA_ROOT?.trim();
  return root ? path.resolve(root) : null;
}

/**
 * Join root + relative path and ensure the result stays under root (no traversal).
 */
export function resolveLocalMediaFile(relativePath: string): string {
  const root = getLocalMediaRoot();
  if (!root) {
    throw new Error("LOCAL_MEDIA_ROOT is not configured");
  }

  const normalized = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.resolve(path.join(root, normalized));
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;

  if (full !== root && !full.startsWith(rootWithSep)) {
    throw new Error("Invalid media path");
  }

  return full;
}

export async function saveLocalMedia(
  relativeUnderRoot: string,
  data: Buffer
): Promise<string> {
  const dest = resolveLocalMediaFile(relativeUnderRoot);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return `${LOCAL_MEDIA_PREFIX}${relativeUnderRoot.replace(/\\/g, "/")}`;
}
