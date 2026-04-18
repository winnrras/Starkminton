"use client";

import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export function LatestHitCard() {
  const hits = useAppStore((s) => s.hits);
  const latest = hits[hits.length - 1];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-gradient-to-br from-ink-900 to-ink-950 p-6">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          Latest hit
        </p>
        {latest && latest.sweet && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
              Sweet
            </span>
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {latest ? (
          <motion.div
            key={latest.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-display text-7xl italic leading-none text-stone-100">
                {Math.round(latest.force).toLocaleString()}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                impact
              </span>
            </div>
            <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-stone-400">
              <span>
                x: <span className="text-stone-200">{latest.x.toFixed(2)}</span>
              </span>
              <span>
                y: <span className="text-stone-200">{latest.y.toFixed(2)}</span>
              </span>
              <span className="ml-auto">
                {new Date(latest.recordedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            <span className="font-display text-7xl italic leading-none text-stone-700">
              —
            </span>
            <p className="mt-4 font-sans text-xs text-stone-500">
              Waiting for first hit.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
