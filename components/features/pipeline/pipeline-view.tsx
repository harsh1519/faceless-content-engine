"use client";

import { useCallback, useState } from "react";

import { ContentDetailModal } from "@/components/features/pipeline/content-detail-modal";
import { KanbanBoard } from "@/components/features/pipeline/kanban-board";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegisterPageAction } from "@/components/providers/page-actions-provider";
import { useApproveScript } from "@/hooks/use-approve-script";
import { useOffers, usePipelineContent, useUpdateContent } from "@/hooks/use-pipeline";
import {
  useActiveChannels,
  useGenerateAndCreateContent,
  useTrendQueue,
} from "@/hooks/use-script-generation";
import { toastError, toastInfo } from "@/lib/toast";
import type { Channel, ContentStatus, Trend } from "@/lib/supabase/types";

export function PipelineView() {
  const {
    data: content,
    isLoading,
    isError,
    error,
    refetch,
  } = usePipelineContent();
  const { data: offers = [] } = useOffers();
  const { data: channels = [] } = useActiveChannels();
  const { data: trends = [] } = useTrendQueue();
  const updateContent = useUpdateContent();
  const approveScript = useApproveScript();
  const generateAndCreate = useGenerateAndCreateContent();
  const [selected, setSelected] = useState<PipelineContent | null>(null);

  const handleTopBarNew = useCallback(() => {
    const draft = content?.find((c) => c.status === "script_review");
    if (draft) {
      setSelected(draft);
      return;
    }
    if (content?.length) {
      toastInfo(
        "No items in Script Review. Open a card on the board or move one into review first."
      );
    } else {
      toastInfo(
        "Use a trend in Trends Queue: pick a channel, then generate a script to add pipeline content."
      );
    }
  }, [content]);

  useRegisterPageAction("onNew", handleTopBarNew);

  async function handleGenerateFromTrend({
    trend,
    channel,
  }: {
    trend: Trend;
    channel: Channel;
  }) {
    await generateAndCreate.mutateAsync({
      channel_id: channel.channel_id,
      trend_id: trend.trend_id,
      keyword: trend.keyword,
      niche: channel.niche_type,
      target_demographics: channel.target_demographics,
      hook_text: trend.hook_text,
    });
  }

  async function handleApproveScript(item: PipelineContent) {
    try {
      await approveScript.mutateAsync({ content: item });
      setSelected((prev) =>
        prev?.video_id === item.video_id
          ? { ...prev, status: "rendering" }
          : prev
      );
    } catch (err) {
      toastError(err, "Approval failed");
    }
  }

  async function handleTransition(videoId: string, status: ContentStatus) {
    const item = content?.find((c) => c.video_id === videoId);
    if (!item) return;

    await updateContent.mutateAsync({
      videoId,
      status,
      currentStatus: item.status,
    });
  }

  async function handleSave(input: {
    videoId: string;
    currentStatus: ContentStatus;
    script?: string;
    offerId?: string | null;
    status?: ContentStatus;
  }) {
    if (input.status === "rendering" && input.currentStatus === "script_review") {
      const item = content?.find((c) => c.video_id === input.videoId);
      if (item) {
        const merged = {
          ...item,
          script: input.script ?? item.script,
          offer_id: input.offerId !== undefined ? input.offerId : item.offer_id,
        };
        await handleApproveScript(merged);
        return;
      }
    }

    await updateContent.mutateAsync(input);
    if (!input.status) {
      setSelected((prev) =>
        prev?.video_id === input.videoId
          ? {
              ...prev,
              script: input.script ?? prev.script,
              offer_id: input.offerId !== undefined ? input.offerId : prev.offer_id,
            }
          : prev
      );
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm font-medium">Could not load pipeline</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Check your Supabase connection."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[500px] w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <KanbanBoard
        content={content ?? []}
        trends={trends}
        channels={channels}
        onOpen={setSelected}
        onTransition={handleTransition}
        onApproveScript={handleApproveScript}
        onGenerateFromTrend={handleGenerateFromTrend}
        isPending={updateContent.isPending}
        isApproving={approveScript.isPending}
        isGenerating={generateAndCreate.isPending}
      />

      <ContentDetailModal
        content={selected}
        offers={offers}
        onClose={() => setSelected(null)}
        onSave={handleSave}
        isPending={updateContent.isPending || approveScript.isPending}
        onScriptRegenerated={(script) => {
          setSelected((prev) => (prev ? { ...prev, script } : prev));
        }}
      />
    </>
  );
}
