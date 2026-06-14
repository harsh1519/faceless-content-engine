import type { SupabaseClient } from "@supabase/supabase-js";

import type { Channel, ContentObject, Platform } from "@/lib/supabase/types";

export interface CreateChannelInput {
  name: string;
  platform: Platform;
  niche_type: string;
  target_demographics: string;
  posts_per_day: number;
}

export async function fetchChannels(
  supabase: SupabaseClient
): Promise<Channel[]> {
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchChannelContent(
  supabase: SupabaseClient,
  channelId: string
): Promise<ContentObject[]> {
  const { data, error } = await supabase
    .from("content_objects")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createChannel(
  supabase: SupabaseClient,
  input: CreateChannelInput
): Promise<Channel> {
  const { data, error } = await supabase
    .from("channels")
    .insert({
      name: input.name,
      platform: input.platform,
      niche_type: input.niche_type,
      target_demographics: input.target_demographics,
      posts_per_day: input.posts_per_day,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChannelAutoPublish(
  supabase: SupabaseClient,
  channelId: string,
  autoPublish: boolean
): Promise<void> {
  const { error } = await supabase
    .from("channels")
    .update({ auto_publish: autoPublish })
    .eq("channel_id", channelId);

  if (error) throw error;
}
