"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { KpiMetric } from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  kpis?: KpiMetric[];
  isLoading: boolean;
}

function TrendBadge({ trend, label }: { trend: number; label: string }) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
          isFlat && "bg-zinc-800 text-muted-foreground",
          isUp && "bg-emerald-500/10 text-emerald-400",
          !isUp && !isFlat && "bg-red-500/10 text-red-400"
        )}
      >
        <Icon className="h-3 w-3" />
        {isFlat ? "0%" : `${Math.abs(trend).toFixed(1)}%`}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function KpiCards({ kpis, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis?.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
            <TrendBadge trend={kpi.trend} label={kpi.trendLabel} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
