import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return unauthorizedResponse();

  const projectId = params.projectId;
  const supabase = await createClient();

  const { data: project, error: pErr } = await supabase
    .from("long_form_projects")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (pErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: sections, error: sErr } = await supabase
    .from("long_form_sections")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({ project, sections: sections ?? [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const user = await requireSessionUser();
  if (!user) return unauthorizedResponse();

  const body = (await request.json()) as { channel_id?: string | null };
  const admin = createAdminClient();

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.channel_id !== undefined) {
    patch.channel_id = body.channel_id;
  }

  const { data, error } = await admin
    .from("long_form_projects")
    .update(patch)
    .eq("project_id", params.projectId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}
