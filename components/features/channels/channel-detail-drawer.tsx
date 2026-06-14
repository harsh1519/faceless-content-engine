"use client";

import Link from "next/link";

import {
  HealthBadge,
  PlatformIcon,
  StatusBadge,
  platformLabel,
} from "@/components/features/channels/channel-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useChannelContent, useChannels, useUpdateChannelAutoPublish } from "@/hooks/use-channels";
import type { Channel, ContentStatus } from "@/lib/supabase/types";

interface ChannelDetailDrawerProps {
  channel: Channel | null;
  onClose: () => void;
}

const statusLabels: Record<ContentStatus, string> = {
  trend_queue: "Trend Queue",
  script_review: "Script Review",
  rendering: "Rendering",
  ready_approve: "Ready / Approve",
  published: "Published",
  failed: "Failed",
};

export function ChannelDetailDrawer({
  channel,
  onClose,
}: ChannelDetailDrawerProps) {
  const { data: channels } = useChannels();
  const liveChannel =
    channels?.find((c) => c.channel_id === channel?.channel_id) ?? channel;
  const { data: content, isLoading } = useChannelContent(
    liveChannel?.channel_id ?? null
  );
  const updateAutoPublish = useUpdateChannelAutoPublish();

  return (
    <Sheet open={!!liveChannel} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {liveChannel && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <PlatformIcon platform={liveChannel.platform} />
                {liveChannel.name}
              </SheetTitle>
              <SheetDescription>
                {platformLabel(liveChannel.platform)} · {liveChannel.niche_type}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section className="space-y-3 rounded-lg border border-border/60 p-4">
                <h3 className="text-sm font-medium">Settings</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Demographics</dt>
                    <dd className="mt-0.5">{liveChannel.target_demographics}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Posts / day</dt>
                    <dd className="mt-0.5">{liveChannel.posts_per_day}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Health</dt>
                    <dd className="mt-0.5">
                      <HealthBadge score={liveChannel.health_score} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-0.5">
                      <StatusBadge status={liveChannel.status} />
                    </dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between rounded-md bg-zinc-900/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Autopilot</p>
                    <p className="text-xs text-muted-foreground">
                      Auto-publish when content is ready
                    </p>
                  </div>
                  <Switch
                    checked={liveChannel.auto_publish}
                    disabled={updateAutoPublish.isPending}
                    onCheckedChange={(checked) =>
                      updateAutoPublish.mutate({
                        channelId: liveChannel.channel_id,
                        autoPublish: checked,
                      })
                    }
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Content</h3>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/pipeline">View Pipeline</Link>
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !content?.length ? (
                  <p className="rounded-lg border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
                    No content assigned to this channel yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {content.map((item) => (
                      <li
                        key={item.video_id}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {statusLabels[item.status]}
                          </Badge>
                          {item.published_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {item.script || "No script yet"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
