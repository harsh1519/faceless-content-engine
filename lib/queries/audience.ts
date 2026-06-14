import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContactChannel, Lead } from "@/lib/supabase/types";

export interface AudienceStats {
  totalLeads: number;
  byChannel: Record<ContactChannel, number>;
  segments: AudienceSegment[];
}

export interface AudienceSegment {
  tag: string;
  leads: Lead[];
  count: number;
}

export async function fetchAudienceData(
  supabase: SupabaseClient
): Promise<AudienceStats> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const leads = (data ?? []).map((lead) => ({
    ...lead,
    intent_tags: Array.isArray(lead.intent_tags)
      ? lead.intent_tags
      : (lead.intent_tags as string[] | null) ?? [],
  })) as Lead[];

  const byChannel: Record<ContactChannel, number> = {
    email: 0,
    telegram: 0,
    sms: 0,
  };

  for (const lead of leads) {
    byChannel[lead.contact_channel]++;
  }

  const segmentMap = new Map<string, Lead[]>();

  for (const lead of leads) {
    const tags =
      lead.intent_tags.length > 0 ? lead.intent_tags : ["uncategorized"];

    for (const tag of tags) {
      const list = segmentMap.get(tag) ?? [];
      list.push(lead);
      segmentMap.set(tag, list);
    }
  }

  const segments = Array.from(segmentMap.entries())
    .map(([tag, segmentLeads]) => ({
      tag,
      leads: segmentLeads,
      count: segmentLeads.length,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalLeads: leads.length,
    byChannel,
    segments,
  };
}

export function formatContactChannel(channel: ContactChannel): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}
