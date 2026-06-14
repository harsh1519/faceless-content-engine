"use client";

import Link from "next/link";
import { AlertTriangle, Radio, Tag, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardAlert } from "@/lib/queries/dashboard";

interface AlertsPanelProps {
  alerts?: DashboardAlert[];
  isLoading: boolean;
}

const alertIcons = {
  channel: Radio,
  content: Video,
  offer: Tag,
};

export function AlertsPanel({ alerts, isLoading }: AlertsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Alerts Needing Attention
        </CardTitle>
        <CardDescription>
          Channels, content, and offers that need a manual review
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!alerts?.length ? (
          <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
            All clear — no alerts right now
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => {
              const Icon = alertIcons[alert.type];
              return (
                <li
                  key={alert.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-zinc-950/50 p-3"
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link href={alert.href}>{alert.actionLabel}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
