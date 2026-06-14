"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/lib/toast";
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
      toastSuccess("Script generated — added to Script Review");
    },
    onError: toastError,
  });
}
