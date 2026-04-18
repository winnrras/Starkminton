"use client";

import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export function HitHistory() {
  const hits = useAppStore((s) => s.hits);
  const reversed = [...hits].reverse().slice(0, 24);

  return (
    <div className="rounded-3xl border border-ink-700 bg-ink-900/40 p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          Hit history
        </p>
        <p className="font-mono text-[10px] text-stone-600">
          {hits.length} total
        </p>
      </div>

      {hits.length === 0 ? (
        <p className="mt-6 font-sans text-sm text-stone-500">
          No hits recorded yet.
        </p>
      ) : (
        <div className="mt-4 -mx-2 overflow-x-auto pb-2">
          <div className="flex min-w-full gap-2 px-2">
            <AnimatePresence initial={false}>
              {reversed.map((hit, i) => (
                <motion.div
                  key={hit.id}
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={`
                    flex min-w-[120px] flex-col gap-1.5 rounded-xl border px-3 py-2.5
                    ${
                      i === 0
                        ? "border-accent/40 bg-accent/5"
                        : "border-ink-700 bg-ink-900/60"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
                      #{hits.length - i}
                    </span>
                    {hit.sweet && (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl italic leading-none text-stone-100">
                      {Math.round(hit.force)}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500">
                      impact
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-stone-500">
                    {new Date(hit.recordedAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
