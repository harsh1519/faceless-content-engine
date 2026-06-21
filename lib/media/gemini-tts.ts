/**
 * Gemini native TTS via REST (same API key as script generation).
 * @see https://ai.google.dev/gemini-api/docs/speech-generation
 */

const GEMINI_GENERATE =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

/** PCM s16le mono @ 24kHz (Gemini TTS preview output). */
const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS = 16;

function buildWavFromPcm(pcm: Buffer): Buffer {
  const dataSize = pcm.length;
  const byteRate = (PCM_SAMPLE_RATE * PCM_CHANNELS * PCM_BITS) / 8;
  const blockAlign = (PCM_CHANNELS * PCM_BITS) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(PCM_CHANNELS, 22);
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(PCM_BITS, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

function extractAudioFromResponse(json: unknown): Buffer {
  const root = json as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    }>;
    error?: { message?: string };
  };

  if (root.error?.message) {
    throw new Error(`Gemini TTS API: ${root.error.message}`);
  }

  const parts = root.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (!data) continue;
    const raw = Buffer.from(data, "base64");
    const mime = (part.inlineData?.mimeType ?? "").toLowerCase();

    if (mime.includes("wav")) {
      return raw;
    }
    if (mime.includes("l16") || mime.includes("pcm") || mime.includes("raw")) {
      return buildWavFromPcm(raw);
    }
    return buildWavFromPcm(raw);
  }

  throw new Error("Gemini TTS returned no audio inlineData");
}

/**
 * Returns WAV bytes suitable for FFmpeg and browsers.
 */
export async function synthesizeSpeechGemini(script: string): Promise<ArrayBuffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model =
    process.env.GEMINI_TTS_MODEL?.trim() || "gemini-2.5-flash-preview-tts";
  const voiceName = process.env.GEMINI_TTS_VOICE?.trim() || "Kore";

  const url =
    GEMINI_GENERATE.replace("{model}", encodeURIComponent(model)) +
    `?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: script.trim() }],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as unknown;
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json
        ? JSON.stringify((json as { error: unknown }).error)
        : String(json);
    throw new Error(`Gemini TTS HTTP ${res.status}: ${msg}`);
  }

  const wav = extractAudioFromResponse(json);
  return wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength);
}
