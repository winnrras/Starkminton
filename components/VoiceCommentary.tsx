"use client";

import { createCommentaryEngine, type CommentaryEngine } from "@/lib/commentaryEngine";
import { useAppStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function VoiceCommentary() {
  const hits = useAppStore((s) => s.hits);

  const engineRef = useRef<CommentaryEngine | null>(null);
  const loadedPromiseRef = useRef<Promise<void> | null>(null);
  const prevHitCountRef = useRef(0);

  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  // Initialize engine on mount
  useEffect(() => {
    engineRef.current = createCommentaryEngine();
    const unsubSpeak = engineRef.current.onSpeakingChange(setSpeaking);

    async function load() {
      setStatus("loading");
      const res = await engineRef.current!.load();
      if (res.ok) {
        setStatus("ready");
      } else {
        setStatus("error");
        setError(res.error || "Load failed");
      }
    }

    loadedPromiseRef.current = load();

    return () => {
      unsubSpeak();
    };
  }, []);

  // Feed hits into the engine whenever a new hit is added.
  // Reset counter if the hits array shrinks (new session).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || status !== "ready") return;

    const prev = prevHitCountRef.current;
    if (hits.length < prev) {
      engine.reset();
    } else if (hits.length > prev) {
      // Only fire onHit for the newly added hits — just call once with latest state
      engine.onHit(hits);
    }
    prevHitCountRef.current = hits.length;
  }, [hits, status]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-ink-700 bg-ink-900/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            AI Commentary
          </span>
          <span className="font-sans text-sm text-stone-200">
            {statusLabel(status, muted)}
          </span>
        </div>
        <AnimatePresence>
          {speaking && !muted && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-0.5 overflow-hidden pl-1"
            >
              <WaveformBar delay={0} />
              <WaveformBar delay={0.1} />
              <WaveformBar delay={0.2} />
              <WaveformBar delay={0.3} />
              <WaveformBar delay={0.15} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={toggleMute}
        disabled={status !== "ready"}
        className={`flex h-7 min-w-0 items-center justify-center rounded-full px-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
          status !== "ready"
            ? "cursor-not-allowed border border-ink-800 bg-ink-900/30 text-stone-600"
            : muted
            ? "border border-ink-700 bg-ink-800 text-stone-400 hover:bg-ink-700"
            : "border border-accent/60 bg-accent/10 text-accent hover:bg-accent/20"
        }`}
      >
        {muted ? "Muted" : "On"}
      </button>

      {status === "error" && error && (
        <span
          className="absolute font-mono text-[9px] text-red-400"
          title={error}
        />
      )}
    </div>
  );
}

function WaveformBar({ delay }: { delay: number }) {
  return (
    <motion.span
      className="block w-0.5 rounded-full bg-accent"
      animate={{ height: ["4px", "12px", "4px"] }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

function statusLabel(
  status: "idle" | "loading" | "ready" | "error",
  muted: boolean
): string {
  switch (status) {
    case "idle":
      return "Starting...";
    case "loading":
      return "Loading voices...";
    case "error":
      return "Unavailable";
    case "ready":
      return muted ? "Muted" : "Listening for hits";
    default:
      return "—";
  }
}
