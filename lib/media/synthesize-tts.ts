import { synthesizeSpeechGemini } from "@/lib/media/gemini-tts";
import { synthesizeSpeech } from "@/lib/media/elevenlabs";

function toBuffer(ab: ArrayBuffer): Buffer {
  return Buffer.from(new Uint8Array(ab));
}

/**
 * ElevenLabs first when configured; on failure (or missing key) use Gemini TTS.
 */
export async function synthesizeTtsToBuffer(script: string): Promise<{
  buffer: Buffer;
  extension: "mp3" | "wav";
  contentType: string;
}> {
  const trimmed = script.trim();
  if (!trimmed) {
    throw new Error("Script is empty");
  }

  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const audioBuffer = await synthesizeSpeech(trimmed);
      return {
        buffer: toBuffer(audioBuffer),
        extension: "mp3",
        contentType: "audio/mpeg",
      };
    } catch {
      const audioBuffer = await synthesizeSpeechGemini(trimmed);
      return {
        buffer: Buffer.from(new Uint8Array(audioBuffer)),
        extension: "wav",
        contentType: "audio/wav",
      };
    }
  }

  const audioBuffer = await synthesizeSpeechGemini(trimmed);
  return {
    buffer: Buffer.from(new Uint8Array(audioBuffer)),
    extension: "wav",
    contentType: "audio/wav",
  };
}
