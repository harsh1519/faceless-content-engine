import type { ContentStatus } from "@/lib/supabase/types";

/** Kanban-visible pipeline stages (excludes `failed`). */
export const PIPELINE_COLUMNS = [
  "trend_queue",
  "script_review",
  "rendering",
  "ready_approve",
  "published",
] as const;

export type PipelineColumnStatus = (typeof PIPELINE_COLUMNS)[number];

export const COLUMN_CONFIG: Record<
  PipelineColumnStatus,
  { title: string; automation: "auto" | "manual" }
> = {
  trend_queue: { title: "Trends Queue", automation: "auto" },
  script_review: { title: "Script Review", automation: "manual" },
  rendering: { title: "Rendering", automation: "auto" },
  ready_approve: { title: "Ready / Approve", automation: "manual" },
  published: { title: "Published", automation: "auto" },
};

const FORWARD: Record<PipelineColumnStatus, PipelineColumnStatus | null> = {
  trend_queue: "script_review",
  script_review: "rendering",
  rendering: "ready_approve",
  ready_approve: "published",
  published: null,
};

/** Stages that may revert to script_review for edits. */
const EDITABLE_FROM: ContentStatus[] = [
  "rendering",
  "ready_approve",
  "published",
  "failed",
];

/**
 * Valid transitions: one step forward, or back to script_review for edits.
 * `failed` is handled outside the Kanban but can return to script_review.
 */
export function canTransition(
  from: ContentStatus,
  to: ContentStatus
): boolean {
  if (from === to) return false;

  if (to === "script_review") {
    return EDITABLE_FROM.includes(from);
  }

  if (from === "failed") return false;

  const forward = FORWARD[from as PipelineColumnStatus];
  return forward === to;
}

export function getForwardStatus(
  status: PipelineColumnStatus
): PipelineColumnStatus | null {
  return FORWARD[status];
}

export function getAllowedTransitions(
  status: ContentStatus
): ContentStatus[] {
  const options: ContentStatus[] = [];

  if (EDITABLE_FROM.includes(status)) {
    options.push("script_review");
  }

  const forward = FORWARD[status as PipelineColumnStatus];
  if (forward) options.push(forward);

  return options;
}

/** Stable mock render progress (20–95%) from video id. */
export function mockRenderProgress(videoId: string): number {
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) {
    hash = videoId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 20 + (Math.abs(hash) % 76);
}
