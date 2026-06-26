"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import {
  buildBrollKeywords,
  requestFetchBroll,
  requestGenerateAudio,
  requestGenerateVisualPlan,
} from "@/lib/queries/media-production";
import { updateContent } from "@/lib/queries/pipeline";
import type { PipelineContent } from "@/lib/queries/pipeline";

export interface ApproveScriptInput {
  content: PipelineContent;
}

export function useApproveScript() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content }: ApproveScriptInput) => {
      if (content.status !== "script_review") {
        throw new Error("Content must be in script_review to approve");
      }

      if (!content.script?.trim()) {
        throw new Error("Script is empty — add a script before approving");
      }

      const keywords = buildBrollKeywords({
        trendKeyword: content.trends?.keyword,
        niche: content.channels?.niche_type,
        script: content.script,
      });

      const [audioResult, visualPlanResult] = await Promise.all([
        requestGenerateAudio({
          video_id: content.video_id,
          script: content.script,
        }),
        requestGenerateVisualPlan({
          script: content.script,
          niche: content.channels?.niche_type,
          production_type: content.production_type ?? "short",
        }),
      ]);
      const brollResult = await requestFetchBroll({
        video_id: content.video_id,
        keywords,
        visual_plan: visualPlanResult.visual_plan,
      });

      const updated = await updateContent(
        supabase,
        { videoId: content.video_id, status: "rendering" },
        content.status
      );

      return {
        ...updated,
        audio_path: audioResult.audio_path,
        broll_urls: brollResult.broll_urls,
        visual_plan: brollResult.visual_plan,
      };
    },
    onMutate: async ({ content }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const previous = queryClient.getQueryData<PipelineContent[]>(["pipeline"]);

      queryClient.setQueryData<PipelineContent[]>(["pipeline"], (old) =>
        old?.map((item) =>
          item.video_id === content.video_id
            ? { ...item, status: "rendering" as const }
            : item
        )
      );

      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["pipeline"], context.previous);
      }
      toastError(err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toastSuccess("Audio, visual plan & B-roll generated — moved to Rendering");
    },
  });
}
