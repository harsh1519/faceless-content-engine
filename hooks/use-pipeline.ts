"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import type { ContentStatus } from "@/lib/supabase/types";
import {
  fetchOffers,
  fetchPipelineContent,
  type PipelineContent,
  updateContent,
  type UpdateContentInput,
} from "@/lib/queries/pipeline";

export function usePipelineContent() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["pipeline"],
    queryFn: () => fetchPipelineContent(supabase),
  });
}

export function useOffers() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["offers"],
    queryFn: () => fetchOffers(supabase),
  });
}

export function useUpdateContent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      currentStatus,
      ...input
    }: UpdateContentInput & { currentStatus: ContentStatus }) =>
      updateContent(supabase, input, currentStatus),
    onMutate: async ({ videoId, status, script, offerId, currentStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const previous = queryClient.getQueryData<PipelineContent[]>(["pipeline"]);

      queryClient.setQueryData<PipelineContent[]>(["pipeline"], (old) =>
        old?.map((item) => {
          if (item.video_id !== videoId) return item;
          return {
            ...item,
            ...(script !== undefined && { script }),
            ...(offerId !== undefined && { offer_id: offerId }),
            ...(status !== undefined && {
              status,
              ...(status === "published" && {
                published_at: new Date().toISOString(),
              }),
            }),
          };
        })
      );

      return { previous, currentStatus };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["pipeline"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onSuccess: (_data, vars) => {
      if (vars.status === "published") toastSuccess("Content published");
      else if (vars.status === "rendering") toastSuccess("Moved to Rendering");
      else if (vars.status) toastSuccess("Status updated");
      else if (vars.script !== undefined) toastSuccess("Changes saved");
    },
    onError: toastError,
  });
}
