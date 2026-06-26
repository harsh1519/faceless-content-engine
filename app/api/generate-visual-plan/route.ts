import { NextResponse } from "next/server";

import { generateVisualPlanWithGemini } from "@/lib/ai/gemini-visual-plan";
import type { ProductionType } from "@/lib/supabase/types";

export interface GenerateVisualPlanRequest {
  script?: string;
  niche?: string | null;
  production_type?: ProductionType;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateVisualPlanRequest;
    const script = body.script?.trim();

    if (!script) {
      return NextResponse.json(
        { error: "script is required" },
        { status: 400 }
      );
    }

    const visualPlan = await generateVisualPlanWithGemini({
      script,
      niche: body.niche,
      production_type: body.production_type,
    });

    return NextResponse.json({ visual_plan: visualPlan });
  } catch (error) {
    console.error("[generate-visual-plan]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate visual plan",
      },
      { status: 500 }
    );
  }
}
