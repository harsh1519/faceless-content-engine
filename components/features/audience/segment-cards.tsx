"use client";

import { Mail, MessageSquare, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AudienceSegment } from "@/lib/queries/audience";

interface SegmentCardsProps {
  segments: AudienceSegment[];
  onBroadcast: (tag: string, count: number) => void;
}

export function SegmentCards({ segments, onBroadcast }: SegmentCardsProps) {
  if (!segments.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
        No segments yet — leads appear here when intent tags are captured.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {segments.map((segment) => (
        <Card key={segment.tag}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize">{segment.tag}</CardTitle>
              <Badge variant="secondary">{segment.count}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {segment.leads.slice(0, 3).map((lead) => (
                <li key={lead.lead_id} className="flex items-center gap-2 truncate">
                  <ChannelIcon channel={lead.contact_channel} />
                  <span className="truncate">{lead.contact_value}</span>
                  {!lead.consent_status && (
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      no consent
                    </Badge>
                  )}
                </li>
              ))}
              {segment.count > 3 && (
                <li className="text-[10px]">+{segment.count - 3} more</li>
              )}
            </ul>
            <Button
              size="sm"
              className="w-full gap-1.5"
              variant="outline"
              onClick={() => onBroadcast(segment.tag, segment.count)}
            >
              <Send className="h-3.5 w-3.5" />
              Broadcast
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "email") return <Mail className="h-3 w-3 shrink-0" />;
  if (channel === "telegram") return <Send className="h-3 w-3 shrink-0" />;
  return <MessageSquare className="h-3 w-3 shrink-0" />;
}
