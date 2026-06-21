"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import {
  createScriptedContent,
  fetchChannelsList,
  fetchTrendQueue,
  requestGeneratedScript,
  updateContentScript,
  type CreateScriptedContentInput,
  type GenerateScriptParams,
} from "@/lib/queries/script-generation";

export function useTrendQueue() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["trend-queue"],
    queryFn: () => fetchTrendQueue(supabase),
  });
}

export function useActiveChannels() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["channels", "active"],
    queryFn: () => fetchChannelsList(supabase),
  });
}

export function useGenerateScript() {
  return useMutation({
    mutationFn: (params: GenerateScriptParams) =>
      requestGeneratedScript(params),
  });
}

export function useCreateScriptedContent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateScriptedContentInput) =>
      createScriptedContent(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRegenerateScript() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      ...params
    }: GenerateScriptParams & { videoId: string }) => {
      const script = await requestGeneratedScript(params);
      return updateContentScript(supabase, videoId, script);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toastSuccess("Script regenerated");
    },
    onError: toastError,
  });
}

export function useGenerateAndCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreateScriptedContentInput & GenerateScriptParams
    ) => {
      const { channel_id, trend_id, offer_id, ...scriptParams } = input;
      const script = await requestGeneratedScript(scriptParams);
      return createScriptedContent(createClient(), {
        channel_id,
        trend_id,
        offer_id,
        script,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["trend-queue"] });
      toastSuccess("Script generated — added to Script Review");
    },
    onError: toastError,
  });
}

export function useDiscoverTrends() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channel_id: string) => {
      const res = await fetch("/api/trends/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id }),
      });
      const data = (await res.json()) as {
        inserted?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Trend discover failed");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trend-queue"] });
      const n = data.inserted ?? 0;
      if (n > 0) {
        toastSuccess(`Added ${n} live trend${n === 1 ? "" : "s"} to the queue`);
      } else if (data.message) {
        toastInfo(data.message);
      } else {
        toastInfo("No new trends returned. Try again in a minute.");
      }
    },
    onError: toastError,
  });
}
