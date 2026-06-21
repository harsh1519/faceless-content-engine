import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { synthesizeTtsToBuffer } from "@/lib/media/synthesize-tts";
import { getLocalMediaRoot, saveLocalMedia } from "@/lib/media/local-storage";
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
    .select("status")
    .eq("project_id", params.projectId)
    .single();

  if (pErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status !== "scripted") {
    return NextResponse.json(
      { error: "Generate section audio requires status scripted" },
      { status: 400 }
    );
  }

  const { data: sections, error: sErr } = await admin
    .from("long_form_sections")
    .select("*")
    .eq("project_id", params.projectId)
    .order("sort_order", { ascending: true });

  if (sErr || !sections?.length) {
    return NextResponse.json({ error: "No sections" }, { status: 400 });
  }

  const useLocal = !!getLocalMediaRoot();

  try {
    for (const sec of sections) {
      if (!sec.script_text?.trim()) {
        throw new Error(`Section "${sec.title}" has empty script`);
      }

      const { buffer, extension, contentType } = await synthesizeTtsToBuffer(
        sec.script_text
      );
      const relative = `long-form/${params.projectId}/sections/${sec.section_id}.${extension}`;

      let audioPath: string;
      if (useLocal) {
        audioPath = await saveLocalMedia(relative, buffer);
      } else {
        const storagePath = relative;
        const { error: upErr } = await admin.storage
          .from("media")
          .upload(storagePath, buffer, { contentType, upsert: true });
        if (upErr) throw new Error(upErr.message);
        audioPath = storagePath;
      }

      const { error: uErr } = await admin
        .from("long_form_sections")
        .update({
          audio_path: audioPath,
          status: "tts_done",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("section_id", sec.section_id);

      if (uErr) throw new Error(uErr.message);
    }

    const { error: upProj } = await admin
      .from("long_form_projects")
      .update({
        status: "tts_ready",
        merged_audio_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId);

    if (upProj) throw new Error(upProj.message);

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
