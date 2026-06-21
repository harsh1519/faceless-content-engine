import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { generateOutlineJson } from "@/lib/ai/long-form-generation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return unauthorizedResponse();

  const admin = createAdminClient();
  const { data: project, error: fetchErr } = await admin
    .from("long_form_projects")
    .select("topic,research_notes,status")
    .eq("project_id", params.projectId)
    .single();

  if (fetchErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!["researched", "failed"].includes(project.status)) {
    return NextResponse.json(
      { error: "Outline requires status researched or failed (with notes)" },
      { status: 400 }
    );
  }

  if (!project.research_notes?.trim()) {
    return NextResponse.json(
      { error: "Research notes are empty" },
      { status: 400 }
    );
  }

  try {
    const outline = await generateOutlineJson(
      project.topic,
      project.research_notes
    );

    await admin
      .from("long_form_sections")
      .delete()
      .eq("project_id", params.projectId);

    const rows = outline.map((item, i) => ({
      project_id: params.projectId,
      sort_order: i,
      title: item.title,
      script_text: "",
      status: "pending" as const,
    }));

    const { error: insErr } = await admin.from("long_form_sections").insert(rows);
    if (insErr) throw new Error(insErr.message);

    const { error: upErr } = await admin
      .from("long_form_projects")
      .update({
        outline,
        status: "outlined",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId);

    if (upErr) throw new Error(upErr.message);
    return NextResponse.json({ outline });
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
