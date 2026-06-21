import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await requireSessionUser();
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("long_form_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return unauthorizedResponse();

  const body = (await request.json()) as {
    title?: string;
    topic?: string;
    channel_id?: string | null;
  };

  const topic = body.topic?.trim();
  const title = body.title?.trim() || topic?.slice(0, 80) || "Untitled";

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("long_form_projects")
    .insert({
      title,
      topic,
      channel_id: body.channel_id?.trim() || null,
      status: "draft",
      research_notes: "",
      outline: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}
