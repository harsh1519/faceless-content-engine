"use client";

import { useCallback } from "react";

import { IntegrationCards } from "@/components/features/settings/integration-cards";
import { useRegisterPageAction } from "@/components/providers/page-actions-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrations } from "@/hooks/use-settings";

export function SettingsView() {
  const { data, isLoading, isError, error, refetch } = useIntegrations();

  const scrollToIntegrations = useCallback(() => {
    document
      .getElementById("settings-integrations")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  useRegisterPageAction("onNew", scrollToIntegrations);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
        <p className="text-sm font-medium">Could not load settings</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Try again later."}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section id="settings-integrations" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium">Integrations</h2>
          <p className="text-xs text-muted-foreground">
            API key status is checked server-side — keys are never exposed to the
            browser.
          </p>
        </div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <IntegrationCards integrations={data} isLoading={false} />
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-zinc-900/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Environment setup</p>
        <p className="mt-2 text-xs leading-relaxed">
          Copy <code className="rounded bg-zinc-800 px-1">.env.local.example</code>{" "}
          to <code className="rounded bg-zinc-800 px-1">.env.local</code> and fill
          in your keys. Restart the dev server after changes. Enable Email auth in
          Supabase Dashboard → Authentication → Providers.
        </p>
      </section>
    </div>
  );
}
