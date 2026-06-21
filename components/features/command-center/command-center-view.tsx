"use client";

import { useCallback, useState } from "react";

import { AlertsPanel } from "@/components/features/command-center/alerts-panel";
import { KpiCards } from "@/components/features/command-center/kpi-cards";
import { RevenueChart } from "@/components/features/command-center/revenue-chart";
import { useRegisterPageAction } from "@/components/providers/page-actions-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDashboard } from "@/hooks/use-dashboard";

export function CommandCenterView() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const [alertRuleOpen, setAlertRuleOpen] = useState(false);

  const openAlertRuleDialog = useCallback(() => setAlertRuleOpen(true), []);
  useRegisterPageAction("onNew", openAlertRuleDialog);

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
      <Dialog open={alertRuleOpen} onOpenChange={setAlertRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New alert rule</DialogTitle>
            <DialogDescription>
              Custom alert rules (e.g. notify when a channel drops below a health
              score) are planned for a future release. For now, use the alerts list
              on this page to monitor your workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setAlertRuleOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
