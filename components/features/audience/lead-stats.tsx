"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatContactChannel } from "@/lib/queries/audience";
import type { ContactChannel } from "@/lib/supabase/types";

interface LeadStatsProps {
  totalLeads: number;
  byChannel: Record<ContactChannel, number>;
}

export function LeadStats({ totalLeads, byChannel }: LeadStatsProps) {
  const channels: ContactChannel[] = ["email", "telegram", "sms"];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">
            {totalLeads.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {channels.map((channel) => {
        const count = byChannel[channel];
        const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : "0";

        return (
          <Card key={channel}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {formatContactChannel(channel)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">{count}</p>
              <p className="text-xs text-muted-foreground">{pct}% of total</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
