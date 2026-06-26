import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  buildVisualPlanPrompt,
  normalizeVisualPlan,
  parseVisualPlanJson,
  type VisualPlanPromptInput,
} from "@/lib/ai/visual-plan";
import { getGeminiScriptModel } from "@/lib/ai/gemini-text-model";
import type { VisualPlanItem } from "@/lib/supabase/types";

export async function generateVisualPlanWithGemini(
  input: VisualPlanPromptInput
): Promise<VisualPlanItem[]> {
  const script = input.script.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[visual-plan] GEMINI_API_KEY missing; using fallback plan");
    return normalizeVisualPlan([], script, input.niche);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiScriptModel() });
    const result = await model.generateContent(
      buildVisualPlanPrompt({ ...input, script })
    );
    const raw = result.response.text();

    return normalizeVisualPlan(parseVisualPlanJson(raw), script, input.niche);
  } catch (error) {
    console.warn(
      "[visual-plan] Gemini planning failed; using fallback plan",
      error instanceof Error ? error.message : error
    );
    return normalizeVisualPlan([], script, input.niche);
  }
}
