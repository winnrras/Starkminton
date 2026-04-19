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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (savedSessions.length === 0) fetchSavedSessions();
  }, [savedSessions.length, fetchSavedSessions]);

  // Clear selection if the selected session is deleted
  useEffect(() => {
    if (selectedId && !savedSessions.some((s) => s.id === selectedId)) {
      setSelectedId(null);
    }
  }, [savedSessions, selectedId]);

  // Close dropdown on outside click
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
    try {
      const res = await fetch(`/api/analyze/${selected.id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setInsights(data.insights || []);
      setAnalyzedSessionLabel(formatSessionLabel(selected.startedAt));
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/40 p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          AI Coach
        </p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-stone-600">
          Powered by Gemini
        </p>
      </div>

      {insights.length === 0 && !analyzing && !error ? (
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
            {/* Dropdown */}
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
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 z-20 mt-2 max-h-56 w-full min-w-[220px] overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900/95 p-1 shadow-xl backdrop-blur"
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
              Analyze →
            </button>
          </div>
        </div>
      ) : analyzing ? (
        <AnalyzingState />
      ) : error ? (
        <ErrorState message={error} onRetry={handleAnalyze} />
      ) : (
        <InsightsList
          insights={insights}
          sessionLabel={analyzedSessionLabel}
          onReset={() => {
            setInsights([]);
            setAnalyzedSessionLabel(null);
          }}
        />
      )}
    </div>
  );
}

function AnalyzingState() {
  return (
    <div className="mt-6 flex flex-col items-start gap-4">
      <div className="flex items-center gap-2">
        <PulsingDot delay={0} />
        <PulsingDot delay={0.15} />
        <PulsingDot delay={0.3} />
      </div>
      <div>
        <p className="font-display text-2xl italic leading-tight text-stone-300">
          Analyzing your session
        </p>
        <p className="mt-2 font-sans text-xs text-stone-500">
          Gemini is studying your hit patterns...
        </p>
      </div>
    </div>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="h-2 w-2 rounded-full bg-accent"
      animate={{ opacity: [0.3, 1, 0.3] }}
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
    <div className="mt-5 flex flex-col gap-3">
      <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-red-400">
          Analysis failed
        </p>
        <p className="mt-1 font-sans text-xs text-red-300">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="self-start rounded-full border border-accent/60 bg-accent/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-accent hover:bg-accent/20"
      >
        Try again
      </button>
    </div>
  );
}

function InsightsList({
  insights,
  sessionLabel,
  onReset,
}: {
  insights: Insight[];
  sessionLabel: string | null;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        {sessionLabel && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            {sessionLabel}
          </p>
        )}
        <button
          onClick={onReset}
          className="font-mono text-[10px] uppercase tracking-widest text-stone-500 hover:text-accent"
        >
          New analysis ↺
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            className="rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-900/80 to-ink-950/40 p-4"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-accent">
                0{i + 1}
              </span>
              <h4 className="font-display text-lg italic leading-tight text-stone-100">
                {ins.title}
              </h4>
            </div>
            <p className="mt-2 font-sans text-xs leading-relaxed text-stone-400">
              {ins.observation}
            </p>
            <p className="mt-2 flex gap-2 font-sans text-xs leading-relaxed text-stone-200">
              <span className="text-accent">→</span>
              <span>{ins.suggestion}</span>
            </p>
          </motion.div>
        ))}
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
