import { NextResponse } from "next/server";

import {
  requireSessionUser,
  unauthorizedResponse,
} from "@/lib/api/require-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { discoverTrendsForChannel } from "@/lib/trends/discover";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  if (!user) return unauthorizedResponse();

  let body: { channel_id?: string };
  try {
    body = (await request.json()) as { channel_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channelId = body.channel_id?.trim();
  if (!channelId) {
    return NextResponse.json({ error: "channel_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: channel, error: chErr } = await supabase
    .from("channels")
    .select("*")
    .eq("channel_id", channelId)
    .single();

  if (chErr || !channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  try {
    const discovered = await discoverTrendsForChannel(channel);
    if (!discovered.length) {
      return NextResponse.json({
        inserted: 0,
        message:
          "No trends returned (Reddit/Google may be rate-limited or unreachable). Try again shortly.",
      });
    }

    const admin = createAdminClient();
    const { data: inserted, error: insErr } = await admin
      .from("trends")
      .insert(
        discovered.map((r) => ({
          source: r.source,
          keyword: r.keyword,
          hook_text: r.hook_text,
          velocity_score: r.velocity_score,
          predicted_epc: r.predicted_epc,
          status: "new" as const,
          channel_id: r.channel_id,
        }))
      )
      .select("trend_id");

    if (insErr) {
      return NextResponse.json(
        { error: insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      inserted: inserted?.length ?? 0,
      trend_ids: (inserted ?? []).map((r) => r.trend_id),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
