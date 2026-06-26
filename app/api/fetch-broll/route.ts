import { NextResponse } from "next/server";

import { fetchContextualBroll } from "@/lib/media/contextual-broll";
import { fetchPortraitClips } from "@/lib/media/pexels";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VisualPlanItem } from "@/lib/supabase/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      video_id?: string;
      keywords?: string[];
      visual_plan?: VisualPlanItem[];
    };

    const videoId = body.video_id?.trim();
    const keywords = body.keywords?.filter(Boolean) ?? [];
    const visualPlan = normalizeIncomingVisualPlan(body.visual_plan);

    if (!videoId) {
      return NextResponse.json(
        { error: "video_id is required" },
        { status: 400 }
      );
    }

    if (keywords.length === 0 && visualPlan.length === 0) {
      return NextResponse.json(
        { error: "At least one keyword or visual_plan item is required" },
        { status: 400 }
      );
    }

    const { broll_urls: clips, visual_plan: enrichedPlan } =
      visualPlan.length > 0
        ? await fetchContextualBroll({
            visual_plan: visualPlan,
            fallback_keywords: keywords,
          })
        : { broll_urls: await fetchPortraitClips(keywords), visual_plan: [] };

    if (clips.length === 0) {
      return NextResponse.json(
        { error: "No portrait clips found for the given keywords" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    const { error: updateError } = await supabase
      .from("content_objects")
      .update({ broll_urls: clips, visual_plan: enrichedPlan })
      .eq("video_id", videoId);

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    return NextResponse.json({ broll_urls: clips, visual_plan: enrichedPlan });
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

function normalizeIncomingVisualPlan(
  visualPlan?: VisualPlanItem[]
): VisualPlanItem[] {
  if (!Array.isArray(visualPlan)) return [];

  return visualPlan
    .map((beat, index) => ({
      beat_index: Number.isFinite(Number(beat.beat_index))
        ? Number(beat.beat_index)
        : index,
      text: String(beat.text ?? "").trim(),
      visual_query: String(beat.visual_query ?? "").trim(),
      duration_seconds: Number.isFinite(Number(beat.duration_seconds))
        ? Number(beat.duration_seconds)
        : 3,
    }))
    .filter((beat) => beat.text && beat.visual_query)
    .slice(0, 40);
}
