import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContentObject, ContentStatus, Offer } from "@/lib/supabase/types";
import { canTransition } from "@/lib/pipeline/state-machine";

export interface PipelineContent extends ContentObject {
  channels: {
    name: string;
    niche_type: string;
    target_demographics: string;
  } | null;
  trends: {
    predicted_epc: number;
    keyword: string;
    hook_text: string;
  } | null;
}

export async function fetchPipelineContent(
  supabase: SupabaseClient
): Promise<PipelineContent[]> {
  const { data, error } = await supabase
    .from("content_objects")
    .select(
      `
      *,
      channels ( name, niche_type, target_demographics ),
      trends ( predicted_epc, keyword, hook_text )
    `
    )
    .in("status", [
      "trend_queue",
      "script_review",
      "rendering",
      "ready_approve",
      "published",
    ])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PipelineContent[];
}

export async function fetchOffers(
  supabase: SupabaseClient
): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export interface UpdateContentInput {
  videoId: string;
  status?: ContentStatus;
  script?: string;
  offerId?: string | null;
}

export async function updateContent(
  supabase: SupabaseClient,
  input: UpdateContentInput,
  currentStatus: ContentStatus
): Promise<ContentObject> {
  const payload: Record<string, unknown> = {};

  if (input.script !== undefined) payload.script = input.script;
  if (input.offerId !== undefined) payload.offer_id = input.offerId;

  if (input.status !== undefined) {
    if (!canTransition(currentStatus, input.status)) {
      throw new Error(
        `Invalid transition: ${currentStatus} → ${input.status}`
      );
    }
    payload.status = input.status;
    if (input.status === "published") {
      payload.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("content_objects")
    .update(payload)
    .eq("video_id", input.videoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Build a public Supabase Storage URL from a relative path. */
export function getStoragePublicUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  return `${base}/storage/v1/object/public/media/${path}`;
}
