import { fetchFreeImageAsset } from "@/lib/media/free-media-sources";
import { fetchPortraitClips, type BrollClip } from "@/lib/media/pexels";
import type { VisualPlanItem } from "@/lib/supabase/types";

export async function fetchContextualBroll(input: {
  visual_plan: VisualPlanItem[];
  fallback_keywords: string[];
}): Promise<{ broll_urls: BrollClip[]; visual_plan: VisualPlanItem[] }> {
  const visualPlan = normalizeVisualPlan(input.visual_plan);
  const fallbackKeywords = normalizeKeywords(input.fallback_keywords);

  if (visualPlan.length === 0) {
    if (fallbackKeywords.length === 0) {
      throw new Error("No visual plan or fallback keywords available for B-roll");
    }

    return {
      broll_urls: await fetchPortraitClips(fallbackKeywords),
      visual_plan: [],
    };
  }

  const brollUrls: BrollClip[] = [];
  const usedIds = new Set<number>();
  const enrichedPlan: VisualPlanItem[] = [];

  for (const beat of visualPlan) {
    const query = beat.visual_query || fallbackKeywords.join(" ");
    const candidates = await fetchCandidatesForBeat(beat, query);
    const clip =
      candidates.find((candidate) => !usedIds.has(candidate.id)) ??
      candidates[0] ??
      null;

    if (!clip) {
      enrichedPlan.push(beat);
      continue;
    }

    usedIds.add(clip.id);
    brollUrls.push(clip);
    enrichedPlan.push({ ...beat, clip });
  }

  if (brollUrls.length > 0) {
    return { broll_urls: brollUrls, visual_plan: enrichedPlan };
  }

  if (fallbackKeywords.length === 0) {
    throw new Error("No portrait clips found for the visual plan");
  }

  return {
    broll_urls: await fetchPortraitClips(fallbackKeywords),
    visual_plan: visualPlan,
  };
}

function normalizeVisualPlan(visualPlan: VisualPlanItem[]): VisualPlanItem[] {
  if (!Array.isArray(visualPlan)) return [];

  return visualPlan
    .map((beat, index) => ({
      beat_index: Number.isFinite(Number(beat.beat_index))
        ? Number(beat.beat_index)
        : index,
      text: String(beat.text ?? "").trim(),
      visual_query: String(beat.visual_query ?? "").trim(),
      duration_seconds: Number.isFinite(Number(beat.duration_seconds))
        ? Number(beat.duration_seconds)
        : 3,
      overlay_text: String(beat.overlay_text ?? "").trim() || undefined,
      emphasis_terms: Array.isArray(beat.emphasis_terms)
        ? beat.emphasis_terms.map(String).map((term) => term.trim()).filter(Boolean)
        : undefined,
      asset_source: beat.asset_source,
      asset_type: beat.asset_type,
      visual_treatment: beat.visual_treatment,
      pattern_interrupt: Boolean(beat.pattern_interrupt),
    }))
    .filter((beat) => beat.text && beat.visual_query)
    .slice(0, 40);
}

async function fetchCandidatesForBeat(
  beat: VisualPlanItem,
  query: string
): Promise<BrollClip[]> {
  const source = beat.asset_source ?? "pexels";
  const type = beat.asset_type ?? "video";

  if (source === "generated_card") return [];

  if (type === "image" && source !== "pexels") {
    const image = await safeFetchImageAsset(source, query);
    if (image) return [image];
  }

  const pexels = await safeFetchPortraitClips([query], 8);
  if (pexels.length > 0) return pexels;

  if (source !== "pexels" && source !== "generated_card") {
    const image = await safeFetchImageAsset(source, query);
    return image ? [image] : [];
  }

  return [];
}

async function safeFetchImageAsset(
  source: VisualPlanItem["asset_source"],
  query: string
): Promise<BrollClip | null> {
  if (
    source !== "unsplash" &&
    source !== "wikimedia" &&
    source !== "nasa" &&
    source !== "openverse"
  ) {
    return null;
  }

  try {
    return await fetchFreeImageAsset({ source, query });
  } catch (error) {
    console.warn(
      "[contextual-broll] image lookup failed",
      source,
      query,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function safeFetchPortraitClips(
  keywords: string[],
  perPage: number
): Promise<BrollClip[]> {
  try {
    return await fetchPortraitClips(keywords, perPage);
  } catch (error) {
    console.warn(
      "[contextual-broll] Pexels lookup failed",
      keywords.join(" "),
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

function normalizeKeywords(keywords: string[]): string[] {
  return keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 3);
}
