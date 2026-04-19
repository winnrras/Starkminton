import { db } from "@/db";
import { hits as hitsTable, sessions as sessionsTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sessions
 * List all saved sessions, newest first.
 */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(sessionsTable)
      .orderBy(desc(sessionsTable.startedAt));
    return NextResponse.json({ sessions: rows });
  } catch (e: any) {
    console.error("GET /api/sessions failed", e);
    return NextResponse.json(
      { error: e.message || "Failed to list sessions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions
 * Body: { id, startedAt, endedAt, name, hits: [{ id, x, y, force, sweet, deviceTimestamp, recordedAt }] }
 * Saves the session and all its hits in one go.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.id || !body?.startedAt) {
      return NextResponse.json(
        { error: "id and startedAt are required" },
        { status: 400 }
      );
    }

    // Insert session
    await db.insert(sessionsTable).values({
      id: body.id,
      name: body.name ?? null,
      startedAt: new Date(body.startedAt),
      endedAt: body.endedAt ? new Date(body.endedAt) : null,
    });

    // Insert hits (if any)
    const incomingHits = Array.isArray(body.hits) ? body.hits : [];
    if (incomingHits.length > 0) {
      await db.insert(hitsTable).values(
        incomingHits.map((h: any) => ({
          id: h.id,
          sessionId: body.id,
          x: h.x,
          y: h.y,
          force: h.force,
          sweet: typeof h.sweet === "boolean" ? h.sweet : null,
          deviceTimestamp: h.deviceTimestamp ?? null,
          recordedAt: new Date(h.recordedAt),
        }))
      );
    }

    return NextResponse.json({ ok: true, id: body.id });
  } catch (e: any) {
    console.error("POST /api/sessions failed", e);
    return NextResponse.json(
      { error: e.message || "Failed to save session" },
      { status: 500 }
    );
  }
}
