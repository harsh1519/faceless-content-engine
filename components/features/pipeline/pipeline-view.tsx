"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { ContentDetailModal } from "@/components/features/pipeline/content-detail-modal";
import { KanbanBoard } from "@/components/features/pipeline/kanban-board";
import { ManualScriptDialog } from "@/components/features/pipeline/manual-script-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegisterPageAction } from "@/components/providers/page-actions-provider";
import { useApproveScript } from "@/hooks/use-approve-script";
import { useOffers, usePipelineContent, useUpdateContent } from "@/hooks/use-pipeline";
import {
  useActiveChannels,
  useCreateScriptedContent,
  useDiscoverTrends,
  useGenerateAndCreateContent,
  useTrendQueue,
} from "@/hooks/use-script-generation";
import type { PipelineContent } from "@/lib/queries/pipeline";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
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
  const createScriptedContent = useCreateScriptedContent();
  const discoverTrends = useDiscoverTrends();
  const [selected, setSelected] = useState<PipelineContent | null>(null);
  const [discoverChannelId, setDiscoverChannelId] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (channels[0]?.channel_id && !discoverChannelId) {
      setDiscoverChannelId(channels[0].channel_id);
    }
  }, [channels, discoverChannelId]);

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
    try {
      await generateAndCreate.mutateAsync({
        channel_id: channel.channel_id,
        trend_id: trend.trend_id,
        keyword: trend.keyword,
        niche: channel.niche_type,
        target_demographics: channel.target_demographics,
        hook_text: trend.hook_text,
      });
    } catch (err) {
      console.error("[pipeline] Generate from trend failed", err);
    }
  }

  async function handleCreateManualScript(input: {
    channel_id: string;
    trend_id?: string | null;
    script: string;
    offer_id?: string | null;
  }) {
    try {
      await createScriptedContent.mutateAsync(input);
      toastSuccess("Manual script added to Script Review");
    } catch (err) {
      toastError(err, "Could not create manual script");
      throw err;
    }
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

    try {
      await updateContent.mutateAsync({
        videoId,
        status,
        currentStatus: item.status,
      });
    } catch (err) {
      console.error("[pipeline] Status update failed", err);
    }
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

    try {
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
    } catch (err) {
      console.error("[pipeline] Save failed", err);
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
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border/60 bg-zinc-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Live trend import</p>
          <p className="text-xs text-muted-foreground">
            Fetches signals for the selected channel&apos;s niche from{" "}
            <span className="text-foreground">Reddit</span>,{" "}
            <span className="text-foreground">Google Trends</span>, and{" "}
            <span className="text-foreground">r/TikTok</span> (free public data; not an official
            TikTok API). Apply{" "}
            <code className="rounded bg-zinc-900 px-1 text-[10px]">004_trends_channel_id.sql</code>{" "}
            in Supabase if imports fail.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={!channels.length || createScriptedContent.isPending}
            onClick={() => setManualOpen(true)}
          >
            <FileText className="h-3.5 w-3.5" />
            Manual script
          </Button>
          <Select
            value={discoverChannelId}
            onValueChange={setDiscoverChannelId}
            disabled={!channels.length}
          >
            <SelectTrigger className="h-9 w-[min(100%,220px)] text-xs">
              <SelectValue placeholder="Channel for niche" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.channel_id} value={ch.channel_id}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!discoverChannelId || discoverTrends.isPending}
            onClick={() => discoverTrends.mutate(discoverChannelId)}
          >
            {discoverTrends.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Fetching…
              </>
            ) : (
              "Pull live trends"
            )}
          </Button>
        </div>
      </div>

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
      <ManualScriptDialog
        open={manualOpen}
        channels={channels}
        offers={offers}
        isPending={createScriptedContent.isPending}
        onOpenChange={setManualOpen}
        onCreate={handleCreateManualScript}
      />
    </>
  );
}
