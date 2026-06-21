import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { buildScriptPrompt } from "@/lib/ai/script-prompt";
import { getGeminiScriptModel } from "@/lib/ai/gemini-text-model";

export interface GenerateScriptRequest {
  keyword: string;
  niche: string;
  target_demographics: string;
  hook_text?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateScriptRequest;

    const keyword = body.keyword?.trim();
    const niche = body.niche?.trim();
    const target_demographics = body.target_demographics?.trim();

    if (!keyword || !niche || !target_demographics) {
      return NextResponse.json(
        { error: "keyword, niche, and target_demographics are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiScriptModel() });

    const prompt = buildScriptPrompt({
      keyword,
      niche,
      target_demographics,
      hook_text: body.hook_text?.trim(),
    });

    const result = await model.generateContent(prompt);
    const script = result.response.text().trim();

    if (!script) {
      return NextResponse.json(
        { error: "Gemini returned an empty script" },
        { status: 502 }
      );
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error("[generate-script]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate script",
      },
      { status: 500 }
    );
  }
}
