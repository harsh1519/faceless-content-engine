import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Concatenate multiple audio files into one MP3 using FFmpeg.
 * Inputs may differ in container/codec; FFmpeg will decode and re-encode.
 */
export async function mergeAudioFilesToMp3(
  inputAbsolutePaths: string[],
  outputAbsolutePath: string
): Promise<void> {
  if (inputAbsolutePaths.length === 0) {
    throw new Error("No audio files to merge");
  }

  if (inputAbsolutePaths.length === 1) {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputAbsolutePaths[0],
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      outputAbsolutePath,
    ]);
    return;
  }

  const args = ["-y"];
  for (const p of inputAbsolutePaths) {
    args.push("-i", p);
  }

  const concatParts = inputAbsolutePaths.map((_, i) => `[${i}:a]`).join("");
  const filter = `${concatParts}concat=n=${inputAbsolutePaths.length}:v=0:a=1[aout]`;

  args.push(
    "-filter_complex",
    filter,
    "-map",
    "[aout]",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    outputAbsolutePath
  );

  await execFileAsync("ffmpeg", args);
}
