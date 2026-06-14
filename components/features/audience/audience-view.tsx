"use client";

import { useState } from "react";

import { LeadStats } from "@/components/features/audience/lead-stats";
import { SegmentCards } from "@/components/features/audience/segment-cards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudience } from "@/hooks/use-audience";
import { toastSuccess } from "@/lib/toast";

export function AudienceView() {
  const { data, isLoading, isError, error, refetch } = useAudience();
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);

  function handleBroadcast(tag: string, count: number) {
    const msg = `Broadcast queued for "${tag}" (${count} lead${count === 1 ? "" : "s"})`;
    toastSuccess(msg);
    setBroadcastMsg(msg);
    setTimeout(() => setBroadcastMsg(null), 4000);
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm font-medium">Could not load audience data</p>
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
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {broadcastMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {broadcastMsg}
        </div>
      )}

      <LeadStats
        totalLeads={data?.totalLeads ?? 0}
        byChannel={
          data?.byChannel ?? { email: 0, telegram: 0, sms: 0 }
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">Segments by intent</h2>
          <p className="text-xs text-muted-foreground">
            Leads grouped by intent tags — broadcast is UI-only in V1
          </p>
        </div>
        <SegmentCards
          segments={data?.segments ?? []}
          onBroadcast={handleBroadcast}
        />
      </section>
    </div>
  );
}
