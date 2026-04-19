import { db } from "@/db";
import { hits as hitsTable, sessions as sessionsTable } from "@/db/schema";
import { buildSessionCsv } from "@/lib/csv";
import type { HitData } from "@/lib/types";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash";

const PROMPT_INSTRUCTIONS = `You are a badminton coach analyzing a practice session from a smart racket.

The attached CSV contains:
- Metadata comments at the top (session stats)
- Hit-by-hit data: normalized coordinates (x, y in 0-1, where 0,0 = top-left of string bed, 1,1 = bottom-right), raw force ADC values (0-4095), and a sweet_spot boolean

The racket's sweet spot zone is a circle centered at (x=0.50, y=0.54) with radius 0.18 in normalized coordinates.

Analyze the session and return exactly 3 insights as strict JSON — no markdown, no commentary, no code fences, just raw JSON:

{
  "insights": [
    {
      "title": "3-5 word title",
      "observation": "One sentence describing what the data shows. Be specific — cite coordinates, percentages, or counts.",
      "suggestion": "One sentence with a tactical or training suggestion. Be concrete and actionable."
    }
  ]
}

Focus on actionable patterns: where hits cluster, whether sweet-spot consistency improves or degrades over the session, edge hits that could be tactical fakes, quadrant biases, timing patterns. Don't give generic advice like "practice more" — be specific.`;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key not configured. Set GEMINI_API_KEY in .env.local and Vercel env vars.",
        },
        { status: 500 }
      );
    }

    const { id } = params;

    // Fetch session + hits from Turso
    const sessionRows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id))
      .limit(1);

    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionRow = sessionRows[0];
    const hitRows = await db
      .select()
      .from(hitsTable)
      .where(eq(hitsTable.sessionId, id))
      .orderBy(asc(hitsTable.recordedAt));

    if (hitRows.length === 0) {
      return NextResponse.json(
        { error: "Session has no hits to analyze" },
        { status: 400 }
      );
    }

    const hits: HitData[] = hitRows.map((h) => ({
      id: h.id,
      x: h.x,
      y: h.y,
      force: h.force,
      sweet: h.sweet,
      deviceTimestamp: h.deviceTimestamp ?? undefined,
      recordedAt:
        h.recordedAt instanceof Date
          ? h.recordedAt.getTime()
          : (h.recordedAt as unknown as number),
    }));

    const csv = buildSessionCsv(
      {
        id: sessionRow.id,
        startedAt: sessionRow.startedAt,
        endedAt: sessionRow.endedAt,
      },
      hits
    );

    // Call Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT_INSTRUCTIONS },
              { text: `\n\nCSV:\n\n${csv}` },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error("Gemini API error", geminiRes.status, errText);
      return NextResponse.json(
        {
          error: `Gemini API returned ${geminiRes.status}`,
          detail: errText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();

    // Extract text from Gemini response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Unexpected Gemini response shape", data);
      return NextResponse.json(
        { error: "Gemini returned no text" },
        { status: 502 }
      );
    }

    // Parse the JSON response from Gemini
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Sometimes the model wraps in markdown fences despite responseMimeType — strip and retry
      const stripped = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      try {
        parsed = JSON.parse(stripped);
      } catch {
        return NextResponse.json(
          { error: "Gemini response was not valid JSON", raw: text.slice(0, 500) },
          { status: 502 }
        );
      }
    }

    const insights = Array.isArray(parsed?.insights) ? parsed.insights : [];
    if (insights.length === 0) {
      return NextResponse.json(
        { error: "Gemini returned no insights" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sessionId: id,
      insights: insights.slice(0, 3).map((ins: any) => ({
        title: String(ins.title ?? "").slice(0, 60),
        observation: String(ins.observation ?? "").slice(0, 300),
        suggestion: String(ins.suggestion ?? "").slice(0, 300),
      })),
    });
  } catch (e: any) {
    console.error("POST /api/analyze/[id] failed", e);
    return NextResponse.json(
      { error: e.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
