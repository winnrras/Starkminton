import { COMMENTARY_LINES, DEFAULT_VOICE_ID } from "@/lib/commentary";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Give this route plenty of time — synthesizing 25+ lines sequentially.
export const maxDuration = 60;

interface GenerateRequestBody {
  voiceId?: string;
}

/**
 * POST /api/voice/generate
 * Body (optional): { voiceId: string }
 *
 * Generates audio for every line in COMMENTARY_LINES using ElevenLabs.
 * Returns an array of { tag, text, audio } where audio is a base64-encoded MP3.
 *
 * The client stores these in memory for the session. No caching on server —
 * regen every app load is fine for hackathon (free tier has plenty of chars).
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in .env.local and Vercel env vars.",
        },
        { status: 500 }
      );
    }

    const body: GenerateRequestBody = await req
      .json()
      .catch(() => ({} as GenerateRequestBody));
    const voiceId = body.voiceId || DEFAULT_VOICE_ID;

    // Synthesize each line. We parallelize in small batches to keep total time
    // down while staying polite to the ElevenLabs rate limits.
    const batchSize = 4;
    const results: {
      tag: string;
      text: string;
      audio: string; // base64-encoded MP3
    }[] = [];

    for (let i = 0; i < COMMENTARY_LINES.length; i += batchSize) {
      const batch = COMMENTARY_LINES.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (line) => {
          const audioBase64 = await synthesize(apiKey, voiceId, line.text);
          return { tag: line.tag, text: line.text, audio: audioBase64 };
        })
      );
      results.push(...batchResults);
    }

    return NextResponse.json({
      voiceId,
      count: results.length,
      clips: results,
    });
  } catch (e: any) {
    console.error("POST /api/voice/generate failed", e);
    return NextResponse.json(
      { error: e.message || "Voice generation failed" },
      { status: 500 }
    );
  }
}

async function synthesize(
  apiKey: string,
  voiceId: string,
  text: string
): Promise<string> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs TTS failed (${res.status}): ${errText.slice(0, 200)}`
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}
