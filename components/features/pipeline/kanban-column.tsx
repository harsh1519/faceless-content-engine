"use client";

import { Badge } from "@/components/ui/badge";
import { ContentCard } from "@/components/features/pipeline/content-card";
import { TrendCard } from "@/components/features/pipeline/trend-card";
import {
  COLUMN_CONFIG,
  type PipelineColumnStatus,
} from "@/lib/pipeline/state-machine";
import type { PipelineContent } from "@/lib/queries/pipeline";
import type { Channel, Trend } from "@/lib/supabase/types";

interface KanbanColumnProps {
  status: PipelineColumnStatus;
  items: PipelineContent[];
  trends?: Trend[];
  channels?: Channel[];
  onOpen: (content: PipelineContent) => void;
  onTransition: (videoId: string, status: PipelineContent["status"]) => void;
  onApproveScript: (content: PipelineContent) => void;
  onGenerateFromTrend?: (input: {
    trend: Trend;
    channel: Channel;
  }) => Promise<void>;
  isPending: boolean;
  isApproving?: boolean;
  isGenerating?: boolean;
}

export function KanbanColumn({
  status,
  items,
  trends = [],
  channels = [],
  onOpen,
  onTransition,
  onApproveScript,
  onGenerateFromTrend,
  isPending,
  isApproving = false,
  isGenerating = false,
}: KanbanColumnProps) {
  const config = COLUMN_CONFIG[status];
  const isAuto = config.automation === "auto";
  const isTrendQueue = status === "trend_queue";
  const totalCount = items.length + (isTrendQueue ? trends.length : 0);
  const isEmpty = totalCount === 0;

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border/60 bg-zinc-900/30">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">{config.title}</h2>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {totalCount}
          </Badge>
        </div>
        <Badge
          variant="outline"
          className="mt-2 text-[10px] font-normal text-muted-foreground"
        >
          {isAuto ? "🤖 Auto" : "✋ Manual gate"}
        </Badge>
      </div>

      <div className="flex max-h-[calc(100vh-220px)] min-h-[420px] flex-1 flex-col gap-2 overflow-y-auto p-2">
        {isEmpty ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Empty
          </p>
        ) : (
          <>
            {isTrendQueue &&
              trends.map((trend) => (
                <TrendCard
                  key={trend.trend_id}
                  trend={trend}
                  channels={channels}
                  onGenerate={onGenerateFromTrend!}
                  isPending={isGenerating}
                />
              ))}
            {items.map((item) => (
              <ContentCard
                key={item.video_id}
                content={item}
                onOpen={onOpen}
                onTransition={onTransition}
                onApproveScript={onApproveScript}
                isPending={isPending}
                isApproving={isApproving}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
