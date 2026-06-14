import { NextResponse } from "next/server";

import { fetchPortraitClips } from "@/lib/media/pexels";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      video_id?: string;
      keywords?: string[];
    };

    const videoId = body.video_id?.trim();
    const keywords = body.keywords?.filter(Boolean) ?? [];

    if (!videoId) {
      return NextResponse.json(
        { error: "video_id is required" },
        { status: 400 }
      );
    }

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: "At least one keyword is required" },
        { status: 400 }
      );
    }

    const clips = await fetchPortraitClips(keywords);

    if (clips.length === 0) {
      return NextResponse.json(
        { error: "No portrait clips found for the given keywords" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    const { error: updateError } = await supabase
      .from("content_objects")
      .update({ broll_urls: clips })
      .eq("video_id", videoId);

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    return NextResponse.json({ broll_urls: clips });
  } catch (error) {
    console.error("[fetch-broll]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "B-roll fetch failed",
      },
      { status: 500 }
    );
  }
}
