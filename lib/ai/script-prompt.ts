export interface ScriptPromptInput {
  keyword: string;
  niche: string;
  target_demographics: string;
  hook_text?: string;
}

export function buildScriptPrompt(input: ScriptPromptInput): string {
  const hookLine = input.hook_text
    ? `\n- Trending hook inspiration: "${input.hook_text}"`
    : "";

  return `You are an expert short-form video scriptwriter for TikTok, Instagram Reels, and YouTube Shorts.

Write a 45-50 second vertical video script for:
- Trend keyword: ${input.keyword}
- Niche: ${input.niche}
- Target audience: ${input.target_demographics}${hookLine}

Requirements:
- Start with a strong 3-second hook (label it HOOK:)
- Fast pacing with short, punchy sentences (label section BODY:)
- End with a clear CTA that uses a comment-trigger word, e.g. "Comment WORD for the link" (label CTA:)
- Total speaking time ~45-50 seconds when read aloud at a natural pace
- Spoken words only — no stage directions, timestamps, or camera notes

Return ONLY the script text with HOOK:/BODY:/CTA: labels. No markdown fences or explanation.`;
}
