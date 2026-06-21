import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

import { resolveLocalMediaFile } from "@/lib/media/local-storage";
import { createClient } from "@/lib/supabase/server";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function guessMime(filePath: string): string {
  const lower = filePath.toLowerCase();
  for (const [ext, mime] of Object.entries(MIME)) {
    if (lower.endsWith(ext)) return mime;
  }
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path ?? [];
  if (!segments.length) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const relative = segments.join("/");

  try {
    const absolute = resolveLocalMediaFile(relative);
    const data = await readFile(absolute);
    return new NextResponse(data, {
      headers: {
        "Content-Type": guessMime(relative),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not configured") || message.includes("Invalid")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
