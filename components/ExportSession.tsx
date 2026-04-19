"use client";

import { useAppStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { HitData } from "@/lib/types";

export function ExportSession() {
  const savedSessions = useAppStore((s) => s.savedSessions);
  const fetchSavedSessions = useAppStore((s) => s.fetchSavedSessions);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure sessions list is loaded
  useEffect(() => {
    if (savedSessions.length === 0) fetchSavedSessions();
  }, [savedSessions.length, fetchSavedSessions]);

  // If the selected session gets deleted elsewhere, clear selection
  useEffect(() => {
    if (selectedId && !savedSessions.some((s) => s.id === selectedId)) {
      setSelectedId(null);
    }
  }, [savedSessions, selectedId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = selectedId
    ? savedSessions.find((s) => s.id === selectedId)
    : null;

  const hasSessions = savedSessions.length > 0;
  const canExport = !!selected && !exporting;

  const buttonDisabledReason = !hasSessions
    ? "No saved sessions yet"
    : !selected
    ? "Pick a session first"
    : null;

  async function handleExport() {
    if (!selected) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/sessions/${selected.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hits: HitData[] = (data.hits || []).map((h: any) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        force: h.force,
        sweet: typeof h.sweet === "boolean" ? h.sweet : null,
        deviceTimestamp: h.deviceTimestamp ?? undefined,
        recordedAt: new Date(h.recordedAt).getTime(),
      }));
      const csv = buildCsv(data.session, hits);
      const filename = buildFilename(data.session);
      triggerDownload(csv, filename);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => hasSessions && setOpen(!open)}
          disabled={!hasSessions}
          className={`flex h-8 min-w-[200px] items-center justify-between gap-3 rounded-full border px-4 font-mono text-[11px] uppercase tracking-widest transition-colors ${
            hasSessions
              ? "border-ink-700 bg-ink-900/60 text-stone-300 hover:border-stone-500"
              : "cursor-not-allowed border-ink-800 bg-ink-900/30 text-stone-600"
          }`}
        >
          <span>
            {selected
              ? formatSessionLabel(selected.startedAt)
              : hasSessions
              ? "Select a session"
              : "No saved sessions"}
          </span>
          <ChevronIcon className={open ? "rotate-180" : ""} />
        </button>

        <AnimatePresence>
          {open && hasSessions && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-full min-w-[240px] overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900/95 p-1 shadow-xl backdrop-blur"
            >
              {savedSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedId(s.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    selectedId === s.id
                      ? "bg-accent/10"
                      : "hover:bg-ink-800/80"
                  }`}
                >
                  <span
                    className={`font-sans text-xs ${
                      selectedId === s.id
                        ? "text-stone-100"
                        : "text-stone-300"
                    }`}
                  >
                    {formatSessionLabel(s.startedAt)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    {formatDuration(s.startedAt, s.endedAt)}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export button with tooltip */}
      <div className="group relative">
        <button
          onClick={handleExport}
          disabled={!canExport}
          className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
            canExport
              ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20"
              : "cursor-not-allowed border-ink-800 bg-ink-900/30 text-stone-600"
          }`}
        >
          {exporting ? "Exporting..." : "Export session ↓"}
        </button>

        {buttonDisabledReason && (
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-ink-700 bg-ink-900/95 px-2.5 py-1 opacity-0 backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
              {buttonDisabledReason}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-150 ${className}`}
    >
      <path d="M2 3.5l3 3 3-3" />
    </svg>
  );
}

function formatSessionLabel(startedAtMs: number): string {
  const d = new Date(startedAtMs);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ` ${time}`
  );
}

function formatDuration(startedAt: number, endedAt: number | null): string {
  if (!endedAt) return "In progress";
  const ms = endedAt - startedAt;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function buildCsv(session: any, hits: HitData[]): string {
  const startedAt = new Date(session.startedAt);
  const endedAt = session.endedAt ? new Date(session.endedAt) : null;
  const durationMs = endedAt
    ? endedAt.getTime() - startedAt.getTime()
    : null;
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

function formatDurationForCsv(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function buildFilename(session: any): string {
  const d = new Date(session.startedAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `starkminton-${yyyy}-${mm}-${dd}-${hh}${min}.csv`;
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
