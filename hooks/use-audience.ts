"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { fetchAudienceData } from "@/lib/queries/audience";

export function useAudience() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["audience"],
    queryFn: () => fetchAudienceData(supabase),
  });
}
