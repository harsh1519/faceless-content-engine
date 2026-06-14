"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { IntegrationStatus } from "@/hooks/use-settings";

interface IntegrationCardsProps {
  integrations?: IntegrationStatus[];
  isLoading: boolean;
}

export function IntegrationCards({
  integrations,
  isLoading,
}: IntegrationCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!integrations?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
        No integration data available.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {integrations.map((item) => {
        const pct = Math.min(
          100,
          Math.round((item.usage.used / item.usage.limit) * 100)
        );

        return (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {item.description}
                  </CardDescription>
                </div>
                <Badge
                  variant={item.configured ? "success" : "danger"}
                  className="shrink-0 gap-1"
                >
                  {item.configured ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {item.configured ? "Connected" : "Missing key"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Usage (mock)</span>
                <span>
                  {item.usage.used.toLocaleString()} /{" "}
                  {item.usage.limit.toLocaleString()} {item.usage.unit}
                </span>
              </div>
              <Progress value={pct} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
