import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { mergeAudioFilesToMp3 } from "@/lib/long-form/merge-audio";
import {
  getLocalMediaRoot,
  isLocalMediaPath,
  resolveLocalMediaFile,
  saveLocalMedia,
  stripLocalPrefix,
} from "@/lib/media/local-storage";
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

  if (project.status !== "tts_ready") {
    return NextResponse.json(
      { error: "Merge requires status tts_ready (run section TTS first)" },
      { status: 400 }
    );
  }

  const { data: sections, error: sErr } = await admin
    .from("long_form_sections")
    .select("audio_path,status,sort_order")
    .eq("project_id", params.projectId)
    .order("sort_order", { ascending: true });

  if (sErr || !sections?.length) {
    return NextResponse.json({ error: "No sections" }, { status: 400 });
  }

  for (const s of sections) {
    if (s.status !== "tts_done" || !s.audio_path) {
      return NextResponse.json(
        { error: "All sections must have TTS completed" },
        { status: 400 }
      );
    }
  }

  const useLocal = !!getLocalMediaRoot();
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), `lf-merge-${params.projectId}-`));
  const outTmp = path.join(tmpDir, "merged.mp3");
  const tempInputs: string[] = [];

  try {
    const absInputs: string[] = [];

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const dbPath = s.audio_path as string;

      if (isLocalMediaPath(dbPath)) {
        absInputs.push(resolveLocalMediaFile(stripLocalPrefix(dbPath)));
      } else {
        const { data: blob, error: dlErr } = await admin.storage
          .from("media")
          .download(dbPath);
        if (dlErr || !blob) {
          throw new Error(`Download section audio failed: ${dbPath} (${dlErr?.message})`);
        }
        const buf = Buffer.from(await blob.arrayBuffer());
        const ext = path.extname(dbPath) || ".mp3";
        const tmpIn = path.join(tmpDir, `in-${i}${ext}`);
        await writeFile(tmpIn, buf);
        tempInputs.push(tmpIn);
        absInputs.push(tmpIn);
      }
    }

    await mergeAudioFilesToMp3(absInputs, outTmp);
    const mergedBuf = await readFile(outTmp);

    const relative = `long-form/${params.projectId}/merged.mp3`;
    let mergedPath: string;
    if (useLocal) {
      mergedPath = await saveLocalMedia(relative, mergedBuf);
    } else {
      const { error: upErr } = await admin.storage
        .from("media")
        .upload(relative, mergedBuf, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (upErr) throw new Error(upErr.message);
      mergedPath = relative;
    }

    const { error: upErr } = await admin
      .from("long_form_projects")
      .update({
        merged_audio_path: mergedPath,
        status: "review",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", params.projectId);

    if (upErr) throw new Error(upErr.message);

    return NextResponse.json({ merged_audio_path: mergedPath });
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
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
