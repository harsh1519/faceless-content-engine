"use client";

import { KanbanColumn } from "@/components/features/pipeline/kanban-column";
import { PIPELINE_COLUMNS } from "@/lib/pipeline/state-machine";
import type { PipelineContent } from "@/lib/queries/pipeline";
import type { Channel, Trend } from "@/lib/supabase/types";

interface KanbanBoardProps {
  content: PipelineContent[];
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

export function KanbanBoard({
  content,
  trends = [],
  channels = [],
  onOpen,
  onTransition,
  onApproveScript,
  onGenerateFromTrend,
  isPending,
  isApproving = false,
  isGenerating = false,
}: KanbanBoardProps) {
  const grouped = PIPELINE_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = content.filter((item) => item.status === status);
      return acc;
    },
    {} as Record<(typeof PIPELINE_COLUMNS)[number], PipelineContent[]>
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          items={grouped[status]}
          trends={status === "trend_queue" ? trends : undefined}
          channels={status === "trend_queue" ? channels : undefined}
          onOpen={onOpen}
          onTransition={onTransition}
          onApproveScript={onApproveScript}
          onGenerateFromTrend={onGenerateFromTrend}
          isPending={isPending}
          isApproving={isApproving}
          isGenerating={isGenerating}
        />
      ))}
    </div>
  );
}
