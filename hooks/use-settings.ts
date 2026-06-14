"use client";

import { useQuery } from "@tanstack/react-query";

export interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  usage: {
    used: number;
    limit: number;
    unit: string;
  };
}

async function fetchIntegrations(): Promise<IntegrationStatus[]> {
  const res = await fetch("/api/settings/integrations");
  if (!res.ok) throw new Error("Failed to load integration status");
  const data = (await res.json()) as { integrations: IntegrationStatus[] };
  return data.integrations;
}

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: fetchIntegrations,
  });
}
