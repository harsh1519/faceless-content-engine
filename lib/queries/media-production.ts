import type { BrollClip } from "@/lib/media/pexels";
import type { ProductionType, VisualPlanItem } from "@/lib/supabase/types";

export interface GenerateAudioParams {
  video_id: string;
  script: string;
}

export interface FetchBrollParams {
  video_id: string;
  keywords: string[];
  visual_plan?: VisualPlanItem[];
}

export interface GenerateVisualPlanParams {
  script: string;
  niche?: string | null;
  production_type?: ProductionType;
}

export async function requestGenerateAudio(
  params: GenerateAudioParams
): Promise<{ audio_path: string }> {
  const res = await fetch("/api/generate-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as { audio_path?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Audio generation failed");
  if (!data.audio_path) throw new Error("No audio_path returned");

  return { audio_path: data.audio_path };
}

export async function requestFetchBroll(
  params: FetchBrollParams
): Promise<{ broll_urls: BrollClip[]; visual_plan: VisualPlanItem[] }> {
  const res = await fetch("/api/fetch-broll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as {
    broll_urls?: BrollClip[];
    visual_plan?: VisualPlanItem[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "B-roll fetch failed");
  if (!data.broll_urls) throw new Error("No broll_urls returned");

  return {
    broll_urls: data.broll_urls,
    visual_plan: data.visual_plan ?? [],
  };
}

export async function requestGenerateVisualPlan(
  params: GenerateVisualPlanParams
): Promise<{ visual_plan: VisualPlanItem[] }> {
  const res = await fetch("/api/generate-visual-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as {
    visual_plan?: VisualPlanItem[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Visual plan generation failed");
  if (!data.visual_plan) throw new Error("No visual_plan returned");

  return { visual_plan: data.visual_plan };
}

export function buildBrollKeywords(input: {
  trendKeyword?: string | null;
  niche?: string | null;
  script?: string;
}): string[] {
  const keywords = new Set<string>();

  if (input.trendKeyword) keywords.add(input.trendKeyword);
  if (input.niche) keywords.add(input.niche);

  if (keywords.size === 0 && input.script) {
    const hookMatch = input.script.match(/HOOK:\s*(.+?)(?:BODY:|$)/i);
    if (hookMatch?.[1]) {
      keywords.add(hookMatch[1].slice(0, 40).trim());
    } else {
      const firstPhrase = input.script
        .replace(/\s+/g, " ")
        .trim()
        .match(/^[^.!?]+/)?.[0];
      if (firstPhrase) keywords.add(firstPhrase.slice(0, 40).trim());
    }
  }

  return Array.from(keywords).slice(0, 3);
}
