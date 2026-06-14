"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateChannel } from "@/hooks/use-channels";
import type { Platform } from "@/lib/supabase/types";

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultForm = {
  name: "",
  platform: "youtube" as Platform,
  niche_type: "",
  target_demographics: "",
  posts_per_day: "1",
};

export function AddChannelDialog({ open, onOpenChange }: AddChannelDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const createChannel = useCreateChannel();

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) setForm(defaultForm);
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createChannel.mutateAsync({
      name: form.name.trim(),
      platform: form.platform,
      niche_type: form.niche_type.trim(),
      target_demographics: form.target_demographics.trim(),
      posts_per_day: Math.max(0, parseInt(form.posts_per_day, 10) || 0),
    });
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Channel</DialogTitle>
            <DialogDescription>
              Create a new distribution channel for your content pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Wealth Whisper"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(value: Platform) =>
                  setForm({ ...form, platform: value })
                }
              >
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="niche">Niche</Label>
              <Input
                id="niche"
                value={form.niche_type}
                onChange={(e) =>
                  setForm({ ...form, niche_type: e.target.value })
                }
                placeholder="personal finance"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="demographics">Target demographics</Label>
              <Input
                id="demographics"
                value={form.target_demographics}
                onChange={(e) =>
                  setForm({ ...form, target_demographics: e.target.value })
                }
                placeholder="25-34, US, male-skewing"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="posts">Posts per day</Label>
              <Input
                id="posts"
                type="number"
                min={0}
                value={form.posts_per_day}
                onChange={(e) =>
                  setForm({ ...form, posts_per_day: e.target.value })
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChannel.isPending}>
              {createChannel.isPending ? "Creating…" : "Create Channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
