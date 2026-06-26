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
}

const SHORT_FORM_BEATS = { min: 10, max: 16 };
const LONG_FORM_BEATS = { min: 18, max: 36 };

export function buildVisualPlanPrompt(input: VisualPlanPromptInput): string {
  const productionType = input.production_type ?? "short";
  const beats = productionType === "long" ? LONG_FORM_BEATS : SHORT_FORM_BEATS;
  const targetDuration =
    productionType === "long"
      ? "Use enough beats to cover the sections without long static shots."
      : "Keep each beat fast, like high-retention Instagram Reels.";

  return `You are a vertical video creative director for faceless TikTok, Instagram Reels, and YouTube Shorts.

Create a scene-by-scene visual plan for the script below.

Context:
- Niche/topic: ${input.niche?.trim() || "general educational/social video"}
- Production type: ${productionType}
- Beat count: ${beats.min}-${beats.max}
- Visual source: stock portrait B-roll search, so every query must be concrete and searchable on Pexels.

Rules:
- Match each visual beat to what is being said in that moment.
- Prefer specific nouns, places, emotions, eras, objects, and actions.
- Avoid abstract queries like "success", "truth", "history facts", or "motivation".
- Do not request text overlays, captions, celebrities, copyrighted footage, or exact people.
- Duration should usually be 2-4 seconds for short form and 3-6 seconds for long form.
- ${targetDuration}

Return ONLY valid JSON in this exact shape:
[
  {
    "text": "spoken script fragment for this beat",
    "visual_query": "specific portrait stock video search query",
    "duration_seconds": 3
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
