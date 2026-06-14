"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import type { Channel } from "@/lib/supabase/types";
import {
  createChannel,
  fetchChannelContent,
  fetchChannels,
  type CreateChannelInput,
  updateChannelAutoPublish,
} from "@/lib/queries/channels";

export function useChannels() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["channels"],
    queryFn: () => fetchChannels(supabase),
  });
}

export function useChannelContent(channelId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["channel-content", channelId],
    queryFn: () => fetchChannelContent(supabase, channelId!),
    enabled: !!channelId,
  });
}

export function useCreateChannel() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateChannelInput) => createChannel(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toastSuccess("Channel created");
    },
    onError: toastError,
  });
}

export function useUpdateChannelAutoPublish() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      channelId,
      autoPublish,
    }: {
      channelId: string;
      autoPublish: boolean;
    }) => updateChannelAutoPublish(supabase, channelId, autoPublish),
    onMutate: async ({ channelId, autoPublish }) => {
      await queryClient.cancelQueries({ queryKey: ["channels"] });
      const previous = queryClient.getQueryData<Channel[]>(["channels"]);

      queryClient.setQueryData<Channel[]>(["channels"], (old) =>
        old?.map((channel) =>
          channel.channel_id === channelId
            ? { ...channel, auto_publish: autoPublish }
            : channel
        )
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["channels"], context.previous);
      }
      toastError(err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
    onSuccess: () => toastSuccess("Autopilot updated"),
  });
}
