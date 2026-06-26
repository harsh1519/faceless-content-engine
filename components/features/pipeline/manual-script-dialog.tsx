"use client";

import { useEffect, useState } from "react";

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
import type { CreateScriptedContentInput } from "@/lib/queries/script-generation";
import type { Channel, Offer } from "@/lib/supabase/types";

interface ManualScriptDialogProps {
  open: boolean;
  channels: Channel[];
  offers: Offer[];
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateScriptedContentInput) => Promise<void>;
}

export function ManualScriptDialog({
  open,
  channels,
  offers,
  isPending,
  onOpenChange,
  onCreate,
}: ManualScriptDialogProps) {
  const [channelId, setChannelId] = useState("");
  const [offerId, setOfferId] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !channelId && channels[0]?.channel_id) {
      setChannelId(channels[0].channel_id);
    }
  }, [channelId, channels, open]);

  async function handleCreate() {
    const trimmedScript = script.trim();
    if (!channelId) {
      setError("Pick a channel first.");
      return;
    }
    if (!trimmedScript) {
      setError("Paste or write a script first.");
      return;
    }

    setError(null);
    try {
      await onCreate({
        channel_id: channelId,
        trend_id: null,
        offer_id: offerId,
        script: trimmedScript,
      });
      setScript("");
      setOfferId(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create script.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create from manual script</DialogTitle>
          <DialogDescription>
            Paste your own short-form script and add it directly to Script Review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="manual-channel">Channel</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger id="manual-channel">
                <SelectValue placeholder="Pick channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.channel_id} value={channel.channel_id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="manual-offer">Assigned offer</Label>
            <Select
              value={offerId ?? "none"}
              onValueChange={(value) => setOfferId(value === "none" ? null : value)}
            >
              <SelectTrigger id="manual-offer">
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

          <div className="grid gap-2">
            <Label htmlFor="manual-script">Script</Label>
            <Textarea
              id="manual-script"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={10}
              placeholder={"HOOK: ...\nBODY: ...\nCTA: ..."}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={handleCreate}>
            {isPending ? "Creating..." : "Create Script Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
