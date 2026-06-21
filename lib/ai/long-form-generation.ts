import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_LONG_FORM_MODEL?.trim() || "gemini-1.5-flash";

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const gen = new GoogleGenerativeAI(key);
  return gen.getGenerativeModel({ model: MODEL });
}

export async function generateResearchNotes(topic: string): Promise<string> {
  const model = getModel();
  const prompt = `You are a research assistant for a documentary-style YouTube video.

Topic: ${topic}

Produce structured research notes (not a script): key facts, timeline if relevant, important names/events, and 3–5 suggested search keywords for stock footage. Use clear headings and bullet points. Stay factual; if uncertain, say "verify". Max ~800 words.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export interface OutlineSection {
  id: string;
  title: string;
}

export async function generateOutlineJson(
  topic: string,
  researchNotes: string
): Promise<OutlineSection[]> {
  const model = getModel();
  const prompt = `Given the topic and research notes below, output a JSON array ONLY (no markdown) of 4–8 sections for a long-form video. Each item: {"id":"slug","title":"Human title"}.

Topic: ${topic}

Research:
${researchNotes}

Rules: ids are lowercase slug with hyphens; titles are concise chapter titles.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Outline model did not return a JSON array");
  }
  const parsed = JSON.parse(jsonMatch[0]) as OutlineSection[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Invalid outline array");
  }
  return parsed.map((row, i) => ({
    id: typeof row.id === "string" ? row.id : `section-${i + 1}`,
    title: typeof row.title === "string" ? row.title : `Section ${i + 1}`,
  }));
}

export async function generateSectionScript(input: {
  topic: string;
  researchNotes: string;
  sectionTitle: string;
  sectionIndex: number;
  totalSections: number;
}): Promise<string> {
  const model = getModel();
  const prompt = `Write narration script for ONE section of a long-form faceless video.

Topic: ${input.topic}
Section ${input.sectionIndex + 1} of ${input.totalSections}: ${input.sectionTitle}

Research context (may contain errors — write conservatively):
${input.researchNotes}

Requirements:
- Spoken narration only, 150–400 words unless this is the intro/outro (then up to 500).
- Optional labels on their own lines: HOOK: / BODY: / CTA: only if it fits this section.
- No stage directions in brackets; plain text suitable for TTS.
- Engaging, clear, factual tone.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
