import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { generateSectionScript } from "@/lib/ai/long-form-generation";
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

  if (!["outlined", "scripted"].includes(project.status)) {
    return NextResponse.json(
      { error: "Write sections requires status outlined or scripted" },
      { status: 400 }
    );
  }

  const { data: sections, error: sErr } = await admin
    .from("long_form_sections")
    .select("*")
    .eq("project_id", params.projectId)
    .order("sort_order", { ascending: true });

  if (sErr || !sections?.length) {
    return NextResponse.json({ error: "No sections found" }, { status: 400 });
  }

  try {
    const total = sections.length;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const script = await generateSectionScript({
        topic: project.topic,
        researchNotes: project.research_notes,
        sectionTitle: sec.title,
        sectionIndex: i,
        totalSections: total,
      });

      const { error: uErr } = await admin
        .from("long_form_sections")
        .update({
          script_text: script,
          status: "written",
          audio_path: null,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("section_id", sec.section_id);

      if (uErr) throw new Error(uErr.message);
    }

    const { error: pErr } = await admin
      .from("long_form_projects")
      .update({
        status: "scripted",
        merged_audio_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId);

    if (pErr) throw new Error(pErr.message);

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
