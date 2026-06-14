import { NextResponse } from "next/server";

import { synthesizeSpeech } from "@/lib/media/elevenlabs";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      video_id?: string;
      script?: string;
    };

    const videoId = body.video_id?.trim();
    const script = body.script?.trim();

    if (!videoId || !script) {
      return NextResponse.json(
        { error: "video_id and script are required" },
        { status: 400 }
      );
    }

    const audioBuffer = await synthesizeSpeech(script);
    const supabase = createAdminClient();
    const storagePath = `audio/${videoId}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { error: updateError } = await supabase
      .from("content_objects")
      .update({ audio_path: storagePath })
      .eq("video_id", videoId);

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    return NextResponse.json({ audio_path: storagePath });
  } catch (error) {
    console.error("[generate-audio]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Audio generation failed",
      },
      { status: 500 }
    );
  }
}
