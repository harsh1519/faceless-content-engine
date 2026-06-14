"use client";

import { PlatformIcon, HealthBadge, StatusBadge } from "@/components/features/channels/channel-utils";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUpdateChannelAutoPublish } from "@/hooks/use-channels";
import type { Channel } from "@/lib/supabase/types";

interface ChannelsTableProps {
  channels: Channel[];
  onSelect: (channel: Channel) => void;
}

export function ChannelsTable({ channels, onSelect }: ChannelsTableProps) {
  const updateAutoPublish = useUpdateChannelAutoPublish();

  if (!channels.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
        No channels yet — use &ldquo;New Channel&rdquo; to create one.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Niche</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Posts/day</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Autopilot</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {channels.map((channel) => (
            <TableRow
              key={channel.channel_id}
              className="cursor-pointer"
              onClick={() => onSelect(channel)}
            >
              <TableCell className="font-medium">{channel.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {channel.niche_type}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 capitalize text-muted-foreground">
                  <PlatformIcon platform={channel.platform} />
                  {channel.platform}
                </div>
              </TableCell>
              <TableCell>
                <HealthBadge score={channel.health_score} />
              </TableCell>
              <TableCell>{channel.posts_per_day}</TableCell>
              <TableCell>
                <StatusBadge status={channel.status} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={channel.auto_publish}
                    disabled={updateAutoPublish.isPending}
                    onCheckedChange={(checked) =>
                      updateAutoPublish.mutate({
                        channelId: channel.channel_id,
                        autoPublish: checked,
                      })
                    }
                    aria-label={`Toggle autopilot for ${channel.name}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {channel.auto_publish ? "On" : "Off"}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
