"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Channel, Trend } from "@/lib/supabase/types";

interface TrendCardProps {
  trend: Trend;
  channels: Channel[];
  onGenerate: (input: {
    trend: Trend;
    channel: Channel;
  }) => Promise<void>;
  isPending: boolean;
}

function formatEpc(value: number): string {
  return `$${Number(value).toFixed(2)}`;
}

export function TrendCard({
  trend,
  channels,
  onGenerate,
  isPending,
}: TrendCardProps) {
  const [channelId, setChannelId] = useState(channels[0]?.channel_id ?? "");

  const channel = channels.find((c) => c.channel_id === channelId);

  async function handleGenerate() {
    if (!channel) return;
    await onGenerate({ trend, channel });
  }

  return (
    <article className="rounded-lg border border-dashed border-border/60 bg-zinc-950/50 p-3">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium leading-tight">{trend.keyword}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{trend.source}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            EPC {formatEpc(trend.predicted_epc)}
          </Badge>
        </div>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {trend.hook_text}
        </p>

        <div className="grid gap-1.5 pt-1">
          <Label className="text-[11px] text-muted-foreground">Channel</Label>
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Pick channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.channel_id} value={ch.channel_id}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          className="h-8 w-full gap-1.5 text-xs"
          disabled={isPending || !channel}
          onClick={handleGenerate}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isPending ? "Generating…" : "Generate Script"}
        </Button>
      </div>
    </article>
  );
}
