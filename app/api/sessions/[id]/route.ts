import { db } from "@/db";
import { hits as hitsTable, sessions as sessionsTable } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, id))
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const sessionHits = await db
      .select()
      .from(hitsTable)
      .where(eq(hitsTable.sessionId, id))
      .orderBy(asc(hitsTable.recordedAt));

    return NextResponse.json({
      session: session[0],
      hits: sessionHits,
    });
  } catch (e: any) {
    console.error("GET /api/sessions/[id] failed", e);
    return NextResponse.json(
      { error: e.message || "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/sessions/[id] failed", e);
    return NextResponse.json(
      { error: e.message || "Failed to delete session" },
      { status: 500 }
    );
  }
}
