"use client";

import { AlertsPanel } from "@/components/features/command-center/alerts-panel";
import { KpiCards } from "@/components/features/command-center/kpi-cards";
import { RevenueChart } from "@/components/features/command-center/revenue-chart";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/use-dashboard";

export function CommandCenterView() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm font-medium">Could not load dashboard data</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "Check your Supabase connection and env vars."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KpiCards kpis={data?.kpis} isLoading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RevenueChart data={data?.revenueSeries} isLoading={isLoading} />
        </div>
        <div className="xl:col-span-2">
          <AlertsPanel alerts={data?.alerts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
