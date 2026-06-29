import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { generateVisualPlanWithGemini } from "@/lib/ai/gemini-visual-plan";
import { fetchContextualBroll } from "@/lib/media/contextual-broll";
import { buildBrollKeywords } from "@/lib/queries/media-production";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return unauthorizedResponse();

  const admin = createAdminClient();
  const { data: project, error: pErr } = await admin
    .from("long_form_projects")
    .select("*")
    .eq("project_id", params.projectId)
    .single();

  if (pErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.channel_id) {
    return NextResponse.json(
      { error: "Set channel_id on the project before enqueue (PATCH project)" },
      { status: 400 }
    );
  }

  if (project.status !== "review" || !project.merged_audio_path) {
    return NextResponse.json(
      { error: "Project must be in review with merged_audio_path" },
      { status: 400 }
    );
  }

  const { data: sections, error: sErr } = await admin
    .from("long_form_sections")
    .select("title,script_text,sort_order")
    .eq("project_id", params.projectId)
    .order("sort_order", { ascending: true });

  if (sErr || !sections?.length) {
    return NextResponse.json({ error: "No sections" }, { status: 400 });
  }

  const fullScript = sections
    .map((s) => `## ${s.title}\n\n${s.script_text}`)
    .join("\n\n");

  try {
    const keywords = buildBrollKeywords({
      niche: project.topic,
      script: fullScript,
    });
    const visualPlan = await generateVisualPlanWithGemini({
      script: fullScript,
      niche: project.topic,
      production_type: "long",
    });
    const { broll_urls: clips, visual_plan: enrichedPlan } =
      await fetchContextualBroll({
        visual_plan: visualPlan,
        fallback_keywords: keywords,
        production_type: "long",
      });
    const videoId = randomUUID();

    const { error: insErr } = await admin.from("content_objects").insert({
      video_id: videoId,
      channel_id: project.channel_id,
      trend_id: null,
      offer_id: null,
      script: fullScript,
      audio_path: project.merged_audio_path,
      broll_urls: clips,
      visual_plan: enrichedPlan,
      status: "rendering",
      production_type: "long",
    });

    if (insErr) throw new Error(insErr.message);

    const { error: upErr } = await admin
      .from("long_form_projects")
      .update({
        final_video_id: videoId,
        status: "queued_render",
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId);

    if (upErr) throw new Error(upErr.message);

    return NextResponse.json({ video_id: videoId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin
      .from("long_form_projects")
      .update({
        status: "failed",
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
