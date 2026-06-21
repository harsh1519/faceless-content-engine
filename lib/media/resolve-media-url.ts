import {
  isLocalMediaPath,
  stripLocalPrefix,
} from "@/lib/media/local-media-path";

/**
 * Browser-playable URL for audio/video stored in Supabase public bucket or local disk.
 */
export function getMediaPublicUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;

  if (isLocalMediaPath(path)) {
    const rel = stripLocalPrefix(path);
    const encoded = rel
      .split("/")
      .map((s) => encodeURIComponent(s))
      .join("/");
    return `/api/media/${encoded}`;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  return `${base}/storage/v1/object/public/media/${path}`;
}
