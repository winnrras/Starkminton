"use client";

import { RacketHeatmap, type CompareSet } from "@/components/RacketHeatmap";
import { useAppStore } from "@/lib/store";
import type { HitData } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const COMPARE_COLOR_A = "#d9ff3f"; // lime
const COMPARE_COLOR_B = "#ff6b8a"; // coral

export function FullscreenSessionBrowser() {
  const liveHits = useAppStore((s) => s.hits);
  const activeSession = useAppStore((s) => s.activeSession);
  const savedSessions = useAppStore((s) => s.savedSessions);
  const fetchSavedSessions = useAppStore((s) => s.fetchSavedSessions);
  const isLoadingSessions = useAppStore((s) => s.isLoadingSessions);
  const viewingSessionId = useAppStore((s) => s.viewingSessionId);
  const viewingHits = useAppStore((s) => s.viewingHits);
  const isLoadingViewingHits = useAppStore((s) => s.isLoadingViewingHits);
  const setViewingSession = useAppStore((s) => s.setViewingSession);

  const compareMode = useAppStore((s) => s.compareMode);
  const setCompareMode = useAppStore((s) => s.setCompareMode);
  const compareIds = useAppStore((s) => s.compareSessionIds);
  const summaries = useAppStore((s) => s.compareSummaries);
  const toggleCompareSession = useAppStore((s) => s.toggleCompareSession);
  const clearCompareSessions = useAppStore((s) => s.clearCompareSessions);
  const isLoadingCompare = useAppStore((s) => s.isLoadingCompare);
  const deleteSession = useAppStore((s) => s.deleteSession);

  // Track which row is in "confirm delete" state (only one at a time)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedSessions();
  }, [fetchSavedSessions]);

  const displayHits: HitData[] =
    viewingSessionId === null ? liveHits : viewingHits;

  const latestHitId = useMemo(
    () =>
      displayHits.length > 0 && viewingSessionId === null
        ? displayHits[displayHits.length - 1].id
        : null,
    [displayHits, viewingSessionId]
  );

  const currentLabel =
    viewingSessionId === null
      ? activeSession
        ? "Live session"
        : "No active session"
      : savedSessions.find((s) => s.id === viewingSessionId)?.startedAt
      ? formatSessionLabel(
          savedSessions.find((s) => s.id === viewingSessionId)!.startedAt
        )
      : "Session";

  // Build compareSets if we have both
  const a = compareIds[0] ? summaries[compareIds[0]] : null;
  const b = compareIds[1] ? summaries[compareIds[1]] : null;
  const bothLoaded = compareMode && !!a && !!b;

  const compareSets: CompareSet[] | undefined = bothLoaded
    ? [
        { hits: a!.hits, color: COMPARE_COLOR_A, label: a!.label },
        { hits: b!.hits, color: COMPARE_COLOR_B, label: b!.label },
      ]
    : undefined;

  return (
    <div className="relative h-full w-full">
      {/* Top-left label */}
      <div className="absolute left-0 top-0 z-10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          {compareMode ? "Comparing" : "Viewing"}
        </p>
        <h3 className="mt-1 font-display text-xl italic text-stone-100">
          {compareMode
            ? a && b
              ? `${a.label} vs ${b.label}`
              : `Pick ${2 - compareIds.length} session${
                  2 - compareIds.length === 1 ? "" : "s"
                }`
            : currentLabel}
        </h3>
      </div>

      {/* Top-right info */}
      <div className="absolute right-0 top-0 z-10 hidden lg:block">
        {compareMode ? (
          <div className="flex items-center gap-3">
            {a && (
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COMPARE_COLOR_A }}
                />
                <span className="font-mono text-[10px] text-stone-500">
                  {a.hits.length}
                </span>
              </div>
            )}
            {b && (
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COMPARE_COLOR_B }}
                />
                <span className="font-mono text-[10px] text-stone-500">
                  {b.hits.length}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="font-mono text-[10px] text-stone-600">
            {isLoadingViewingHits ? "Loading..." : `${displayHits.length} hits`}
          </p>
        )}
      </div>

      {/* Racket */}
      <div className="absolute inset-0 flex items-center justify-center">
        {!compareMode && isLoadingViewingHits ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
            Loading hits...
          </div>
        ) : compareMode && isLoadingCompare && !bothLoaded ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
            Loading sessions...
          </div>
        ) : (
          <div className="h-full w-full px-4">
            <RacketHeatmap
              hits={displayHits}
              latestHitId={latestHitId}
              orientation="horizontal"
              headOnly
              compareSets={compareSets}
            />
          </div>
        )}
      </div>

      {/* Sessions panel */}
      <div className="absolute right-0 top-12 z-20 flex h-[calc(100%-3rem)] w-full max-w-[340px] flex-col rounded-2xl border border-ink-700 bg-ink-900/70 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Sessions
          </p>
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) clearCompareSessions();
            }}
            className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${
              compareMode
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-ink-700 bg-transparent text-stone-400 hover:border-stone-500 hover:text-stone-200"
            }`}
          >
            {compareMode ? "Exit compare" : "Compare"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {!compareMode && activeSession && (
            <SessionRow
              label="Live session"
              sublabel={`${liveHits.length} hits • live`}
              isSelected={viewingSessionId === null}
              isLive
              onClick={() => setViewingSession(null)}
            />
          )}

          {isLoadingSessions && savedSessions.length === 0 ? (
            <p className="px-3 py-4 font-mono text-[10px] uppercase tracking-widest text-stone-600">
              Loading...
            </p>
          ) : savedSessions.length === 0 && !activeSession ? (
            <p className="px-3 py-4 font-mono text-[11px] text-stone-500">
              No saved sessions yet. End a session and hit{" "}
              <span className="text-accent">Save</span> to store it.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {savedSessions.map((s) => {
                const isChecked = compareIds.includes(s.id);
                const checkedIdx = compareIds.indexOf(s.id);
                const color =
                  checkedIdx === 0
                    ? COMPARE_COLOR_A
                    : checkedIdx === 1
                    ? COMPARE_COLOR_B
                    : undefined;
                return (
                  <SessionRow
                    key={s.id}
                    label={formatSessionLabel(s.startedAt)}
                    sublabel={formatDuration(s.startedAt, s.endedAt)}
                    isSelected={
                      compareMode ? isChecked : viewingSessionId === s.id
                    }
                    compareMode={compareMode}
                    isChecked={isChecked}
                    checkColor={color}
                    onClick={() => {
                      if (compareMode) toggleCompareSession(s.id);
                      else setViewingSession(s.id);
                    }}
                    isConfirmingDelete={confirmingDeleteId === s.id}
                    isDeleting={deletingId === s.id}
                    onDeleteRequest={() => setConfirmingDeleteId(s.id)}
                    onDeleteCancel={() => setConfirmingDeleteId(null)}
                    onDeleteConfirm={async () => {
                      setDeletingId(s.id);
                      setConfirmingDeleteId(null);
                      await deleteSession(s.id);
                      setDeletingId(null);
                    }}
                  />
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Stats diff panel — only when compare mode + both loaded */}
        <AnimatePresence>
          {bothLoaded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-ink-800"
            >
              <div className="px-4 py-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
                  Stats diff
                </p>
                <div className="space-y-2.5">
                  <DiffRow
                    label="Hits"
                    a={a!.hitCount}
                    b={b!.hitCount}
                    higherIsBetter
                  />
                  <DiffRow
                    label="Sweet %"
                    a={Math.round(a!.sweetPct)}
                    b={Math.round(b!.sweetPct)}
                    suffix="%"
                    higherIsBetter
                  />
                  <DiffRow
                    label="Max force"
                    a={Math.round(a!.maxForce)}
                    b={Math.round(b!.maxForce)}
                    higherIsBetter
                  />
                  <DiffRow
                    label="Duration"
                    a={a!.durationMs}
                    b={b!.durationMs}
                    formatter={formatDurationShort}
                    neutralOnly
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SessionRow({
  label,
  sublabel,
  isSelected,
  isLive,
  compareMode,
  isChecked,
  checkColor,
  onClick,
  isConfirmingDelete,
  isDeleting,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  label: string;
  sublabel: string;
  isSelected: boolean;
  isLive?: boolean;
  compareMode?: boolean;
  isChecked?: boolean;
  checkColor?: string;
  onClick: () => void;
  isConfirmingDelete?: boolean;
  isDeleting?: boolean;
  onDeleteRequest?: () => void;
  onDeleteCancel?: () => void;
  onDeleteConfirm?: () => void;
}) {
  // Trash visible only on saved sessions (not live), and hidden in compare mode
  const canDelete = !isLive && !compareMode && !!onDeleteRequest;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: isDeleting ? 0.4 : 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        group relative mb-1 flex w-full items-center justify-between overflow-hidden rounded-xl px-3 py-2.5 text-left transition-colors
        ${isSelected ? "bg-accent/10" : "hover:bg-ink-800/60"}
      `}
      style={
        compareMode && isChecked && checkColor
          ? { backgroundColor: `${checkColor}1A` }
          : undefined
      }
    >
      {isSelected && !compareMode && (
        <motion.span
          layoutId="session-row-indicator"
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent"
        />
      )}

      {isConfirmingDelete ? (
        /* Inline confirmation state */
        <div className="flex w-full items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-rose-400">
            Delete?
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConfirm?.();
              }}
              className="rounded-full bg-rose-500/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-rose-300 transition-colors hover:bg-rose-500/40"
            >
              Yes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCancel?.();
              }}
              className="rounded-full border border-ink-700 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-stone-400 transition-colors hover:bg-ink-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main clickable area — select session or toggle compare */}
          <button
            onClick={onClick}
            className="flex flex-1 items-center text-left"
          >
            {compareMode && (
              <div
                className="mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                style={{
                  borderColor: checkColor ?? "#3a3f4b",
                  backgroundColor:
                    isChecked && checkColor ? checkColor : "transparent",
                }}
              >
                {isChecked && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2 2 4-4"
                      stroke="#0a0b0f"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <span
                className={`font-sans text-sm ${
                  isSelected ? "text-stone-100" : "text-stone-300"
                }`}
              >
                {label}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                {sublabel}
              </span>
            </div>
          </button>

          {/* Trailing icons */}
          <div className="flex items-center gap-2 pl-2">
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
            )}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest?.();
                }}
                aria-label="Delete session"
                disabled={isDeleting}
                className="flex h-6 w-6 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

function TrashIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h8" />
      <path d="M4.5 3V2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1" />
      <path d="M3 3l.5 7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5l.5-7" />
      <path d="M5 5.5v3" />
      <path d="M7 5.5v3" />
    </svg>
  );
}

function DiffRow({
  label,
  a,
  b,
  suffix,
  higherIsBetter,
  formatter,
  neutralOnly,
}: {
  label: string;
  a: number | null;
  b: number | null;
  suffix?: string;
  higherIsBetter?: boolean;
  formatter?: (v: number | null) => string;
  neutralOnly?: boolean;
}) {
  const fmt = (v: number | null) =>
    formatter
      ? formatter(v)
      : v === null
      ? "—"
      : `${v.toLocaleString()}${suffix ?? ""}`;

  let deltaText = "—";
  let deltaColor = "text-stone-500";
  if (a !== null && b !== null && !neutralOnly) {
    const delta = b - a;
    if (delta !== 0) {
      const sign = delta > 0 ? "+" : "";
      deltaText = `${sign}${Math.round(delta).toLocaleString()}${suffix ?? ""}`;
      const isImprovement = higherIsBetter ? delta > 0 : delta < 0;
      deltaColor = isImprovement ? "text-emerald-400" : "text-rose-400";
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className="font-mono text-stone-200"
          style={{ color: COMPARE_COLOR_A }}
        >
          {fmt(a)}
        </span>
        <span className={`font-mono text-[10px] ${deltaColor}`}>
          {deltaText}
        </span>
        <span
          className="font-mono text-stone-200"
          style={{ color: COMPARE_COLOR_B }}
        >
          {fmt(b)}
        </span>
      </div>
    </div>
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

function formatDurationShort(ms: number | null): string {
  if (ms === null) return "—";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
