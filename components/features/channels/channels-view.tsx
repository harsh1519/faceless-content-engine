"use client";

import { useCallback, useState } from "react";

import { AddChannelDialog } from "@/components/features/channels/add-channel-dialog";
import { ChannelDetailDrawer } from "@/components/features/channels/channel-detail-drawer";
import { ChannelsTable } from "@/components/features/channels/channels-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRegisterPageAction,
} from "@/components/providers/page-actions-provider";
import { useChannels } from "@/hooks/use-channels";
import type { Channel } from "@/lib/supabase/types";

export function ChannelsView() {
  const { data: channels, isLoading, isError, error, refetch } = useChannels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  useRegisterPageAction("onNew", openDialog);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm font-medium">Could not load channels</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Check your Supabase connection."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end lg:hidden">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Add Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <ChannelsTable
          channels={channels ?? []}
          onSelect={setSelectedChannel}
        />
      )}

      <AddChannelDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ChannelDetailDrawer
        channel={selectedChannel}
        onClose={() => setSelectedChannel(null)}
      />
    </>
  );
}
