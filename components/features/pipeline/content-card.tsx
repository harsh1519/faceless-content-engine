"use client";

import type { MouseEvent } from "react";
import Image from "next/image";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockRenderProgress } from "@/lib/pipeline/state-machine";
import type { PipelineContent } from "@/lib/queries/pipeline";

interface ContentCardProps {
  content: PipelineContent;
  onOpen: (content: PipelineContent) => void;
  onTransition: (videoId: string, status: PipelineContent["status"]) => void;
  onApproveScript: (content: PipelineContent) => void;
  isPending: boolean;
  isApproving: boolean;
}

function formatEpc(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${Number(value).toFixed(2)}`;
}

export function ContentCard({
  content,
  onOpen,
  onTransition,
  onApproveScript,
  isPending,
  isApproving,
}: ContentCardProps) {
  const channelName = content.channels?.name ?? "Unknown channel";
  const niche = content.channels?.niche_type ?? "";
  const epc = content.trends?.predicted_epc;

  return (
    <article
      className="cursor-pointer rounded-lg border border-border/60 bg-zinc-950/80 p-3 shadow-sm transition-colors hover:border-border hover:bg-zinc-900/80"
      onClick={() => onOpen(content)}
    >
      {content.thumbnail_url && (
        <div className="relative mb-2 aspect-[9/16] w-full overflow-hidden rounded-md bg-zinc-800">
          <Image
            src={content.thumbnail_url}
            alt=""
            fill
            className="object-cover"
            sizes="200px"
            unoptimized
          />
        </div>
      )}

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium leading-tight">{channelName}</p>
          {niche && (
            <p className="text-[11px] text-muted-foreground">{niche}</p>
          )}
        </div>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {content.script || "No script yet"}
        </p>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            EPC {formatEpc(epc)}
          </Badge>
        </div>

        <CardActions
          content={content}
          onOpen={onOpen}
          onTransition={onTransition}
          onApproveScript={onApproveScript}
          isPending={isPending}
          isApproving={isApproving}
        />
      </div>
    </article>
  );
}

function CardActions({
  content,
  onOpen,
  onTransition,
  onApproveScript,
  isPending,
  isApproving,
}: ContentCardProps) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  const busy = isPending || isApproving;

  switch (content.status) {
    case "script_review":
      return (
        <div className="flex gap-1.5 pt-1" onClick={stop}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={busy}
            onClick={() => onOpen(content)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={busy}
            onClick={() => onApproveScript(content)}
          >
            {isApproving ? "Processing…" : "Approve →"}
          </Button>
        </div>
      );

    case "rendering":
      return (
        <div className="space-y-1.5 pt-1" onClick={stop}>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Rendering</span>
            <span>{mockRenderProgress(content.video_id)}%</span>
          </div>
          <Progress value={mockRenderProgress(content.video_id)} />
        </div>
      );

    case "ready_approve":
      return (
        <div className="flex gap-1.5 pt-1" onClick={stop}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={busy}
            onClick={() => onOpen(content)}
          >
            Preview
          </Button>
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={busy}
            onClick={() => onTransition(content.video_id, "published")}
          >
            Approve & Publish →
          </Button>
        </div>
      );

    default:
      return null;
  }
}
