"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  computeAlerts,
  computeKpis,
  computeRevenueSeries,
  fetchDashboardData,
} from "@/lib/queries/dashboard";

export function useDashboard() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboardData(supabase),
    select: (data) => ({
      raw: data,
      kpis: computeKpis(data),
      alerts: computeAlerts(data),
      revenueSeries: computeRevenueSeries(data.conversions),
    }),
  });
}
