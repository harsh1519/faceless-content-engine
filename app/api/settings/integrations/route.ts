import { NextResponse } from "next/server";

export interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  usage: {
    used: number;
    limit: number;
    unit: string;
  };
}

export async function GET() {
  const integrations: IntegrationStatus[] = [
    {
      id: "supabase",
      name: "Supabase",
      description: "Database, auth, and file storage",
      configured: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      usage: { used: 3, limit: 10, unit: "channels" },
    },
    {
      id: "gemini",
      name: "Google Gemini",
      description: "AI script generation + Gemini TTS fallback",
      configured: !!process.env.GEMINI_API_KEY,
      usage: { used: 18, limit: 50, unit: "requests/day" },
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs",
      description: "Text-to-speech audio",
      configured: !!process.env.ELEVENLABS_API_KEY,
      usage: { used: 8420, limit: 10000, unit: "characters" },
    },
    {
      id: "pexels",
      name: "Pexels",
      description: "Vertical B-roll stock footage",
      configured: !!process.env.PEXELS_API_KEY,
      usage: { used: 24, limit: 200, unit: "requests/hour" },
    },
    {
      id: "service_role",
      name: "Supabase Service Role",
      description: "Server-side storage uploads and renderer",
      configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      usage: { used: 5, limit: 100, unit: "renders" },
    },
    {
      id: "local_media",
      name: "Local media root",
      description: "Store audio/renders on disk (set LOCAL_MEDIA_ROOT)",
      configured: !!process.env.LOCAL_MEDIA_ROOT,
      usage: { used: 0, limit: 1, unit: "path configured" },
    },
  ];

  return NextResponse.json({ integrations });
}
