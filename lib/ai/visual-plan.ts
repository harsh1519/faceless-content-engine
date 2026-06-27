import type { ProductionType, VisualPlanItem } from "@/lib/supabase/types";

export interface VisualPlanPromptInput {
  script: string;
  niche?: string | null;
  production_type?: ProductionType;
}

interface RawVisualPlanItem {
  text?: unknown;
  visual_query?: unknown;
  duration_seconds?: unknown;
  overlay_text?: unknown;
  emphasis_terms?: unknown;
  visual_treatment?: unknown;
  pattern_interrupt?: unknown;
}

const SHORT_FORM_BEATS = { min: 10, max: 16 };
const LONG_FORM_BEATS = { min: 18, max: 36 };
const VISUAL_TREATMENTS = ["push_in", "pull_out", "side_pan", "snap_zoom"] as const;

export function buildVisualPlanPrompt(input: VisualPlanPromptInput): string {
  const productionType = input.production_type ?? "short";
  const beats = productionType === "long" ? LONG_FORM_BEATS : SHORT_FORM_BEATS;
  const targetDuration =
    productionType === "long"
      ? "Use enough beats to cover the sections without long static shots."
      : "Keep each beat fast, like high-retention Instagram Reels.";

  return `You are a vertical video creative director for faceless TikTok, Instagram Reels, and YouTube Shorts.

Create a scene-by-scene creative plan for the script below.

Context:
- Niche/topic: ${input.niche?.trim() || "general educational/social video"}
- Production type: ${productionType}
- Beat count: ${beats.min}-${beats.max}
- Visual source: stock portrait B-roll search, so every query must be concrete and searchable on Pexels.
- Goal: high user retention, premium visual rhythm, curiosity, and clear meaning in the first second.

Rules:
- Match each visual beat to what is being said in that moment.
- Prefer specific nouns, places, emotions, eras, objects, and actions.
- Avoid abstract queries like "success", "truth", "history facts", or "motivation".
- Do not request text overlays, captions, celebrities, copyrighted footage, or exact people.
- Duration should usually be 2-4 seconds for short form and 3-6 seconds for long form.
- Make the first 2 beats visually strong enough to stop scrolling.
- Add a short overlay_text for each beat using 2-6 words, not a full sentence.
- Pick 1-3 emphasis_terms that should feel important in captions.
- Use visual_treatment to guide motion: push_in, pull_out, side_pan, or snap_zoom.
- Mark pattern_interrupt true every 3-5 beats when the viewer needs a visual reset.
- ${targetDuration}

Return ONLY valid JSON in this exact shape:
[
  {
    "text": "spoken script fragment for this beat",
    "visual_query": "specific portrait stock video search query",
    "duration_seconds": 3,
    "overlay_text": "short punchy phrase",
    "emphasis_terms": ["important", "words"],
    "visual_treatment": "push_in",
    "pattern_interrupt": false
  }
]

Script:
${input.script.trim()}`;
}

export function normalizeVisualPlan(
  rawItems: unknown,
  fallbackScript: string,
  fallbackNiche?: string | null
): VisualPlanItem[] {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const normalized = items
    .map((item, index) => normalizeVisualPlanItem(item, index, fallbackNiche))
    .filter((item): item is VisualPlanItem => item !== null)
    .slice(0, 40);

  if (normalized.length > 0) {
    return normalized.map((item, index) => ({
      ...item,
      beat_index: index,
    }));
  }

  return fallbackVisualPlan(fallbackScript, fallbackNiche);
}

export function parseVisualPlanJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  const start = jsonText.indexOf("[");
  const end = jsonText.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Visual plan response did not contain a JSON array");
  }

  return JSON.parse(jsonText.slice(start, end + 1));
}

function normalizeVisualPlanItem(
  item: unknown,
  index: number,
  fallbackNiche?: string | null
): VisualPlanItem | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as RawVisualPlanItem;
  const text = String(raw.text ?? "").replace(/\s+/g, " ").trim();
  const query = String(raw.visual_query ?? "").replace(/\s+/g, " ").trim();
  const duration = Number(raw.duration_seconds);

  if (!text || !query) return null;

  return {
    beat_index: index,
    text: text.slice(0, 260),
    visual_query: enrichQuery(query, fallbackNiche),
    duration_seconds: Number.isFinite(duration)
      ? Math.min(Math.max(duration, 1.5), 8)
      : 3,
    overlay_text: normalizeOverlayText(raw.overlay_text, text),
    emphasis_terms: normalizeEmphasisTerms(raw.emphasis_terms, text),
    visual_treatment: normalizeTreatment(raw.visual_treatment, index),
    pattern_interrupt:
      typeof raw.pattern_interrupt === "boolean"
        ? raw.pattern_interrupt
        : index > 0 && index % 4 === 0,
  };
}

function fallbackVisualPlan(
  script: string,
  fallbackNiche?: string | null
): VisualPlanItem[] {
  const cleaned = script
    .replace(/\bHOOK:\s*/gi, "")
    .replace(/\bBODY:\s*/gi, "")
    .replace(/\bCTA:\s*/gi, "")
    .replace(/#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts =
    cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()) ??
    [cleaned || fallbackNiche || "story"];

  return parts.slice(0, 24).map((part, index) => ({
    beat_index: index,
    text: part.slice(0, 260),
    visual_query: enrichQuery(part.slice(0, 80), fallbackNiche),
    duration_seconds: 3,
    overlay_text: normalizeOverlayText(null, part),
    emphasis_terms: normalizeEmphasisTerms(null, part),
    visual_treatment: normalizeTreatment(null, index),
    pattern_interrupt: index > 0 && index % 4 === 0,
  }));
}

function enrichQuery(query: string, fallbackNiche?: string | null): string {
  const base = [query, fallbackNiche].filter(Boolean).join(" ");
  const withoutLabels = base
    .replace(/\b(HOOK|BODY|CTA):/gi, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${withoutLabels || "cinematic story"} vertical cinematic`.slice(0, 120);
}

function normalizeOverlayText(raw: unknown, fallbackText: string): string {
  const value = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (value) return value.slice(0, 46);

  const words = fallbackText
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 5);
  return words.join(" ").slice(0, 46);
}

function normalizeEmphasisTerms(raw: unknown, fallbackText: string): string[] {
  if (Array.isArray(raw)) {
    const terms = raw
      .map((term) => String(term).replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 3);
    if (terms.length > 0) return terms;
  }

  return fallbackText
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5)
    .slice(0, 3);
}

function normalizeTreatment(raw: unknown, index: number): VisualPlanItem["visual_treatment"] {
  const value = String(raw ?? "").trim();
  if (VISUAL_TREATMENTS.includes(value as (typeof VISUAL_TREATMENTS)[number])) {
    return value as VisualPlanItem["visual_treatment"];
  }
  return VISUAL_TREATMENTS[index % VISUAL_TREATMENTS.length];
}
