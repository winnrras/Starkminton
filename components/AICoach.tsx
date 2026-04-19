"use client";

import { useAppStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Insight {
  title: string;
  observation: string;
  suggestion: string;
}

export function AICoach() {
  const savedSessions = useAppStore((s) => s.savedSessions);
  const fetchSavedSessions = useAppStore((s) => s.fetchSavedSessions);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analyzedSessionLabel, setAnalyzedSessionLabel] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (savedSessions.length === 0) fetchSavedSessions();
  }, [savedSessions.length, fetchSavedSessions]);

  useEffect(() => {
    if (selectedId && !savedSessions.some((s) => s.id === selectedId)) {
      setSelectedId(null);
    }
  }, [savedSessions, selectedId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [dropdownOpen]);

  // Escape closes modal
  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const selected = selectedId
    ? savedSessions.find((s) => s.id === selectedId)
    : null;
  const hasSessions = savedSessions.length > 0;
  const canAnalyze = !!selected && !analyzing;

  async function handleAnalyze() {
    if (!selected) return;
    setAnalyzing(true);
    setError(null);
    setInsights([]);
    setAnalyzedSessionLabel(formatSessionLabel(selected.startedAt));
    setModalOpen(true);
    try {
      const res = await fetch(`/api/analyze/${selected.id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setInsights(data.insights || []);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleRetry() {
    setError(null);
    handleAnalyze();
  }

  return (
    <>
      {/* Compact card on the dashboard */}
      <div className="relative rounded-3xl border border-ink-700 bg-ink-900/40 p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            AI Coach
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-stone-600">
            Powered by Gemini
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="font-display text-2xl italic leading-tight text-stone-300">
              Get coaching insights
            </p>
            <p className="mt-2 font-sans text-xs text-stone-500">
              Analyze a past session for specific, actionable feedback on hit
              patterns and technique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => hasSessions && setDropdownOpen(!dropdownOpen)}
                disabled={!hasSessions}
                className={`flex h-8 min-w-[180px] items-center justify-between gap-3 rounded-full border px-4 font-mono text-[11px] uppercase tracking-widest transition-colors ${
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
                <ChevronIcon className={dropdownOpen ? "rotate-180" : ""} />
              </button>

              <AnimatePresence>
                {dropdownOpen && hasSessions && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full left-0 z-30 mb-2 max-h-56 w-full min-w-[220px] overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900/95 p-1 shadow-xl backdrop-blur"
                  >
                    {savedSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedId(s.id);
                          setDropdownOpen(false);
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

            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                canAnalyze
                  ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20"
                  : "cursor-not-allowed border-ink-800 bg-ink-900/30 text-stone-600"
              }`}
            >
              {analyzing ? "Analyzing..." : "Analyze →"}
            </button>
          </div>

          {insights.length > 0 && !modalOpen && (
            <button
              onClick={() => setModalOpen(true)}
              className="self-start font-mono text-[10px] uppercase tracking-widest text-accent hover:text-accent/80"
            >
              View last analysis ↗
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen modal with insights */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-ink-950/90 backdrop-blur-xl"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-6 lg:p-10"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto relative flex h-full max-h-[92vh] w-full max-w-[900px] flex-col overflow-hidden rounded-3xl border border-ink-700 bg-gradient-to-b from-ink-900 to-ink-950"
              >
                <div className="flex items-center justify-between border-b border-ink-800 px-6 py-4 lg:px-10">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                      AI Coach • Gemini
                    </p>
                    <h2 className="mt-1 font-display text-2xl italic text-stone-100 lg:text-3xl">
                      {analyzedSessionLabel || "Session analysis"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    aria-label="Close"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 bg-ink-800/60 text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-100"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6 lg:p-10">
                  {analyzing ? (
                    <AnalyzingState />
                  ) : error ? (
                    <ErrorState message={error} onRetry={handleRetry} />
                  ) : (
                    <InsightsList insights={insights} />
                  )}
                </div>

                <div className="border-t border-ink-800 px-6 py-3 lg:px-10">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
                    Press{" "}
                    <kbd className="rounded border border-ink-700 bg-ink-900 px-1.5 py-0.5 text-stone-400">
                      Esc
                    </kbd>{" "}
                    to close
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AnalyzingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-3">
        <PulsingDot delay={0} />
        <PulsingDot delay={0.15} />
        <PulsingDot delay={0.3} />
      </div>
      <div className="text-center">
        <p className="font-display text-3xl italic leading-tight text-stone-200">
          Analyzing your session
        </p>
        <p className="mt-3 font-sans text-sm text-stone-500">
          Gemini is studying your hit patterns...
        </p>
      </div>
    </div>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="h-2.5 w-2.5 rounded-full bg-accent"
      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
      transition={{
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="max-w-md rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-red-400">
          Analysis failed
        </p>
        <p className="mt-1 font-sans text-sm text-red-300">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-full border border-accent/60 bg-accent/10 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-accent hover:bg-accent/20"
      >
        Try again
      </button>
    </div>
  );
}

function InsightsList({ insights }: { insights: Insight[] }) {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4">
      {insights.map((ins, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.12, duration: 0.4 }}
          className="rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-900/80 to-ink-950/40 p-5 lg:p-6"
        >
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-accent">
              0{i + 1}
            </span>
            <h4 className="font-display text-xl italic leading-tight text-stone-100 lg:text-2xl">
              {ins.title}
            </h4>
          </div>
          <p className="mt-3 font-sans text-sm leading-relaxed text-stone-400">
            {ins.observation}
          </p>
          <p className="mt-3 flex gap-2 font-sans text-sm leading-relaxed text-stone-200">
            <span className="shrink-0 text-accent">→</span>
            <span>{ins.suggestion}</span>
          </p>
        </motion.div>
      ))}
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

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M1 1l12 12M13 1L1 13" />
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
