"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getAllowedTransitions,
  getForwardStatus,
  COLUMN_CONFIG,
  type PipelineColumnStatus,
} from "@/lib/pipeline/state-machine";
import {
  getStoragePublicUrl,
  type PipelineContent,
} from "@/lib/queries/pipeline";
import type { ContentStatus, Offer } from "@/lib/supabase/types";
import { useRegenerateScript } from "@/hooks/use-script-generation";

interface ContentDetailModalProps {
  content: PipelineContent | null;
  offers: Offer[];
  onClose: () => void;
  onSave: (input: {
    videoId: string;
    currentStatus: ContentStatus;
    script?: string;
    offerId?: string | null;
    status?: ContentStatus;
  }) => Promise<void>;
  isPending: boolean;
  onScriptRegenerated?: (script: string) => void;
}

const STATUS_LABELS: Record<ContentStatus, string> = {
  trend_queue: "Trends Queue",
  script_review: "Script Review",
  rendering: "Rendering",
  ready_approve: "Ready / Approve",
  published: "Published",
  failed: "Failed",
};

export function ContentDetailModal({
  content,
  offers,
  onClose,
  onSave,
  isPending,
  onScriptRegenerated,
}: ContentDetailModalProps) {
  const [script, setScript] = useState("");
  const [offerId, setOfferId] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const regenerate = useRegenerateScript();

  useEffect(() => {
    if (content) {
      setScript(content.script);
      setOfferId(content.offer_id);
    }
  }, [content]);

  if (!content) return null;

  const allowed = getAllowedTransitions(content.status);
  const forward = getForwardStatus(content.status as PipelineColumnStatus);
  const audioUrl = getStoragePublicUrl(content.audio_path);
  const videoUrl = getStoragePublicUrl(content.render_path);

  async function handleRegenerate() {
    if (!content?.channels) {
      setGenError("Channel data required to regenerate.");
      return;
    }

    setGenError(null);
    try {
      const updated = await regenerate.mutateAsync({
        videoId: content.video_id,
        keyword: content.trends?.keyword ?? content.channels.niche_type,
        niche: content.channels.niche_type,
        target_demographics: content.channels.target_demographics,
        hook_text: content.trends?.hook_text,
      });
      setScript(updated.script);
      onScriptRegenerated?.(updated.script);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Regeneration failed");
    }
  }

  const canRegenerate = !!content?.channels;
  const isBusy = isPending || regenerate.isPending;

  async function handleSave() {
    await onSave({
      videoId: content!.video_id,
      currentStatus: content!.status,
      script,
      offerId,
    });
  }

  async function handleTransition(status: ContentStatus) {
    await onSave({
      videoId: content!.video_id,
      currentStatus: content!.status,
      script,
      offerId,
      status,
    });
    if (status === "published") onClose();
  }

  return (
    <Dialog open={!!content} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {content.channels?.name ?? "Content detail"}
            <Badge variant="outline" className="text-[10px] font-normal">
              {STATUS_LABELS[content.status]}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {content.channels?.niche_type}
            {content.trends?.predicted_epc != null &&
              ` · EPC $${Number(content.trends.predicted_epc).toFixed(2)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="script">Script</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={!canRegenerate || isBusy}
                onClick={handleRegenerate}
              >
                <Sparkles className="h-3 w-3" />
                {regenerate.isPending ? "Regenerating…" : "Regenerate"}
              </Button>
            </div>
            <Textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={8}
            />
            {genError && (
              <p className="text-xs text-red-400">{genError}</p>
            )}
            {!canRegenerate && (
              <p className="text-[10px] text-muted-foreground">
                Channel data unavailable for regeneration.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="offer">Assigned offer</Label>
            <Select
              value={offerId ?? "none"}
              onValueChange={(v) => setOfferId(v === "none" ? null : v)}
            >
              <SelectTrigger id="offer">
                <SelectValue placeholder="Select offer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No offer</SelectItem>
                {offers.map((offer) => (
                  <SelectItem key={offer.offer_id} value={offer.offer_id}>
                    {offer.name} (${Number(offer.payout).toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {audioUrl && (
            <div className="grid gap-2">
              <Label>Audio preview</Label>
              <audio controls className="w-full" src={audioUrl}>
                Your browser does not support audio playback.
              </audio>
              {!content.audio_path?.startsWith("http") && (
                <p className="text-[10px] text-muted-foreground">
                  Path: {content.audio_path}
                </p>
              )}
            </div>
          )}

          {videoUrl && (
            <div className="grid gap-2">
              <Label>Video preview</Label>
              <video
                controls
                className="max-h-64 w-full rounded-md bg-black"
                src={videoUrl}
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {!audioUrl && content.audio_path && (
            <p className="text-xs text-muted-foreground">
              Audio: {content.audio_path} (upload in Phase 7)
            </p>
          )}
          {!videoUrl && content.render_path && (
            <p className="text-xs text-muted-foreground">
              Video: {content.render_path} (render in Phase 8)
            </p>
          )}

          {content.broll_urls?.length > 0 && (
            <div className="grid gap-2">
              <Label>B-roll clips ({content.broll_urls.length})</Label>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {content.broll_urls.map((clip) => (
                  <li key={clip.id} className="truncate">
                    {clip.width}×{clip.height} · {clip.duration}s
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {allowed.includes("script_review") && content.status !== "script_review" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => handleTransition("script_review")}
              >
                ← Back to Script Review
              </Button>
            )}
            {forward && (
              <Button
                size="sm"
                disabled={isBusy}
                onClick={() => handleTransition(forward)}
              >
                {content.status === "script_review" && forward === "rendering"
                  ? isBusy
                    ? "Generating media…"
                    : "Approve → Rendering"
                  : `Move to ${COLUMN_CONFIG[forward].title} →`}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button disabled={isBusy} onClick={handleSave}>
              {isBusy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
