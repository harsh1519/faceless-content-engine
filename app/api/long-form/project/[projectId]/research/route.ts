import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { generateResearchNotes } from "@/lib/ai/long-form-generation";
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
    .select("topic,status")
    .eq("project_id", params.projectId)
    .single();

  if (fetchErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!["draft", "failed", "researched"].includes(project.status)) {
    return NextResponse.json(
      { error: "Research can only run from draft, failed, or researched (re-run)" },
      { status: 400 }
    );
  }

  try {
    const notes = await generateResearchNotes(project.topic);
    const { error: upErr } = await admin
      .from("long_form_projects")
      .update({
        research_notes: notes,
        status: "researched",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId);

    if (upErr) throw new Error(upErr.message);
    return NextResponse.json({ ok: true });
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
