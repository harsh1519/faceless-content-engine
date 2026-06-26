import type { SupabaseClient } from "@supabase/supabase-js";

import type { Channel, ContentObject, Trend } from "@/lib/supabase/types";

export async function fetchTrendQueue(
  supabase: SupabaseClient
): Promise<Trend[]> {
  const { data: channelRows, error: chErr } = await supabase
    .from("channels")
    .select("channel_id")
    .eq("status", "active");

  if (chErr) throw chErr;

  const activeIds = (channelRows ?? [])
    .map((r) => r.channel_id as string)
    .filter(Boolean);

  if (activeIds.length === 0) {
    const { data, error } = await supabase
      .from("trends")
      .select("*")
      .in("status", ["new", "approved"])
      .is("channel_id", null)
      .order("velocity_score", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  const { data: globalTrends, error: gErr } = await supabase
    .from("trends")
    .select("*")
    .in("status", ["new", "approved"])
    .is("channel_id", null)
    .order("velocity_score", { ascending: false });

  if (gErr) throw gErr;

  const { data: scopedTrends, error: sErr } = await supabase
    .from("trends")
    .select("*")
    .in("status", ["new", "approved"])
    .in("channel_id", activeIds)
    .order("velocity_score", { ascending: false });

  if (sErr) throw sErr;

  const merged = [...(globalTrends ?? []), ...(scopedTrends ?? [])];
  merged.sort(
    (a, b) => Number(b.velocity_score) - Number(a.velocity_score)
  );

  const byId = new Map<string, Trend>();
  for (const t of merged) {
    byId.set(t.trend_id, t as Trend);
  }
  return Array.from(byId.values());
}

export async function fetchChannelsList(
  supabase: SupabaseClient
): Promise<Channel[]> {
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export interface GenerateScriptParams {
  keyword: string;
  niche: string;
  target_demographics: string;
  hook_text?: string;
}

export async function requestGeneratedScript(
  params: GenerateScriptParams
): Promise<string> {
  const res = await fetch("/api/generate-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as { script?: string; error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? "Script generation failed");
  }

  if (!data.script) {
    throw new Error("No script returned from API");
  }

  return data.script;
}

export interface CreateScriptedContentInput {
  channel_id: string;
  trend_id?: string | null;
  script: string;
  offer_id?: string | null;
}

export async function createScriptedContent(
  supabase: SupabaseClient,
  input: CreateScriptedContentInput
): Promise<ContentObject> {
  const { data, error } = await supabase
    .from("content_objects")
    .insert({
      channel_id: input.channel_id,
      trend_id: input.trend_id ?? null,
      script: input.script,
      offer_id: input.offer_id ?? null,
      status: "script_review",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContentScript(
  supabase: SupabaseClient,
  videoId: string,
  script: string
): Promise<ContentObject> {
  const { data, error } = await supabase
    .from("content_objects")
    .update({ script })
    .eq("video_id", videoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
