"use client";

import { RacketHeatmap } from "@/components/RacketHeatmap";
import { useAppStore } from "@/lib/store";
import type { HitData } from "@/lib/types";
import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";

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

  return (
    <div className="relative h-full w-full">
      {/* Viewing label, top-left */}
      <div className="absolute left-0 top-0 z-10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          Viewing
        </p>
        <h3 className="mt-1 font-display text-xl italic text-stone-100">
          {currentLabel}
        </h3>
      </div>

      {/* Hit count, top-right above sessions panel */}
      <div className="absolute right-0 top-0 z-10 hidden lg:block">
        <p className="font-mono text-[10px] text-stone-600">
          {isLoadingViewingHits ? "Loading..." : `${displayHits.length} hits`}
        </p>
      </div>

      {/* Horizontal racket — fills full width */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isLoadingViewingHits ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
            Loading hits...
          </div>
        ) : (
          <div className="h-full w-full px-4">
            <RacketHeatmap
              hits={displayHits}
              latestHitId={latestHitId}
              orientation="horizontal"
              headOnly
            />
          </div>
        )}
      </div>

      {/* Sessions panel — overlays on the right, shaft visible underneath */}
      <div className="absolute right-0 top-12 z-20 flex h-[calc(100%-3rem)] w-full max-w-[320px] flex-col rounded-2xl border border-ink-700 bg-ink-900/70 backdrop-blur-md">
        <div className="border-b border-ink-800 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Sessions
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {activeSession && (
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
            savedSessions.map((s) => (
              <SessionRow
                key={s.id}
                label={formatSessionLabel(s.startedAt)}
                sublabel={formatDuration(s.startedAt, s.endedAt)}
                isSelected={viewingSessionId === s.id}
                onClick={() => setViewingSession(s.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  label,
  sublabel,
  isSelected,
  isLive,
  onClick,
}: {
  label: string;
  sublabel: string;
  isSelected: boolean;
  isLive?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
      className={`
        group relative mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors
        ${isSelected ? "bg-accent/10" : "hover:bg-ink-800/60"}
      `}
    >
      {isSelected && (
        <motion.span
          layoutId="session-row-indicator"
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent"
        />
      )}
      <div className="flex flex-col">
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
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      )}
    </motion.button>
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
