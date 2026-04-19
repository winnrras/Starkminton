import type { HitData } from "./types";

/**
 * Builds a CSV with metadata comments at the top followed by hit-by-hit rows.
 * Used by both the export feature (client-side download) and the analyze feature
 * (server-side prompt to Gemini).
 */
export function buildSessionCsv(
  session: {
    id: string;
    startedAt: Date | number;
    endedAt: Date | number | null;
  },
  hits: HitData[]
): string {
  const startedAt =
    session.startedAt instanceof Date
      ? session.startedAt
      : new Date(session.startedAt);
  const endedAt = session.endedAt
    ? session.endedAt instanceof Date
      ? session.endedAt
      : new Date(session.endedAt)
    : null;

  const durationMs = endedAt ? endedAt.getTime() - startedAt.getTime() : null;
  const hitCount = hits.length;
  const sweetCount = hits.filter((h) => h.sweet).length;
  const sweetPct =
    hitCount > 0 ? Math.round((sweetCount / hitCount) * 100) : 0;
  const maxForce = hits.reduce((m, h) => Math.max(m, h.force), 0);
  const avgForce =
    hitCount > 0 ? hits.reduce((s, h) => s + h.force, 0) / hitCount : 0;

  const meta = [
    `# Starkminton session export`,
    `# Session ID: ${session.id}`,
    `# Started: ${startedAt.toISOString()}`,
    `# Ended: ${endedAt ? endedAt.toISOString() : "(not ended)"}`,
    `# Duration: ${durationMs !== null ? formatDurationForCsv(durationMs) : "—"}`,
    `# Total hits: ${hitCount}`,
    `# Sweet-spot hits: ${sweetCount} (${sweetPct}%)`,
    `# Max force: ${Math.round(maxForce)}`,
    `# Avg force: ${Math.round(avgForce)}`,
    `#`,
  ];

  const header = [
    "hit_number",
    "recorded_at_iso",
    "device_timestamp_ms",
    "x_normalized",
    "y_normalized",
    "force",
    "sweet_spot",
  ].join(",");

  const rows = hits.map((h, i) => {
    return [
      i + 1,
      new Date(h.recordedAt).toISOString(),
      h.deviceTimestamp ?? "",
      h.x.toFixed(4),
      h.y.toFixed(4),
      h.force.toFixed(2),
      h.sweet === null ? "" : h.sweet ? "true" : "false",
    ].join(",");
  });

  return [...meta, header, ...rows].join("\n");
}

export function formatDurationForCsv(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}
