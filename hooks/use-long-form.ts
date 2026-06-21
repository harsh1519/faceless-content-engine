"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type {
  LongFormProjectRow,
  LongFormSectionRow,
} from "@/lib/supabase/types";

async function fetchProjects(): Promise<LongFormProjectRow[]> {
  const res = await fetch("/api/long-form/project");
  const data = (await res.json()) as {
    projects?: LongFormProjectRow[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Failed to load projects");
  return data.projects ?? [];
}

async function fetchDetail(projectId: string) {
  const res = await fetch(`/api/long-form/project/${projectId}`);
  const data = (await res.json()) as {
    project?: LongFormProjectRow;
    sections?: LongFormSectionRow[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Failed to load project");
  return { project: data.project!, sections: data.sections ?? [] };
}

export function useLongFormProjects() {
  return useQuery({
    queryKey: ["long-form-projects"],
    queryFn: fetchProjects,
  });
}

export function useLongFormDetail(projectId: string | null) {
  return useQuery({
    queryKey: ["long-form-project", projectId],
    queryFn: () => fetchDetail(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateLongFormProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      topic: string;
      title?: string;
      channel_id?: string | null;
    }) => {
      const res = await fetch("/api/long-form/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as {
        project?: LongFormProjectRow;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      return data.project!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["long-form-projects"] });
    },
  });
}

export function useUpdateLongFormChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      channel_id: string | null;
    }) => {
      const res = await fetch(`/api/long-form/project/${input.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: input.channel_id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["long-form-projects"] });
      qc.invalidateQueries({ queryKey: ["long-form-project", v.projectId] });
    },
  });
}

function postStep(projectId: string, path: string) {
  return fetch(`/api/long-form/project/${projectId}/${path}`, {
    method: "POST",
  }).then(async (res) => {
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Step failed");
    return data;
  });
}

export function useLongFormPipeline(projectId: string | null) {
  const qc = useQueryClient();

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["long-form-projects"] });
    if (projectId) {
      qc.invalidateQueries({ queryKey: ["long-form-project", projectId] });
    }
  }, [qc, projectId]);

  const runResearch = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project");
      return postStep(projectId, "research");
    },
    onSuccess: invalidate,
  });

  const runOutline = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project");
      return postStep(projectId, "outline");
    },
    onSuccess: invalidate,
  });

  const writeSections = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project");
      return postStep(projectId, "sections/write");
    },
    onSuccess: invalidate,
  });

  const ttsAll = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project");
      return postStep(projectId, "sections/tts-all");
    },
    onSuccess: invalidate,
  });

  const mergeAudio = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project");
      return postStep(projectId, "merge-audio");
    },
    onSuccess: invalidate,
  });

  const enqueueRender = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project");
      return postStep(projectId, "enqueue-render");
    },
    onSuccess: invalidate,
  });

  return {
    runResearch,
    runOutline,
    writeSections,
    ttsAll,
    mergeAudio,
    enqueueRender,
  };
}

export function useChannelsForPicker() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["channels-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("channel_id,name,platform")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
