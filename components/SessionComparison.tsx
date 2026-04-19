"use client";

import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";

const COMPARE_COLOR_A = "#d9ff3f"; // lime
const COMPARE_COLOR_B = "#ff6b8a"; // coral pink

interface SessionComparisonProps {
  onOpenFullscreen?: () => void;
}

export function SessionComparison({ onOpenFullscreen }: SessionComparisonProps) {
  const compareIds = useAppStore((s) => s.compareSessionIds);
  const summaries = useAppStore((s) => s.compareSummaries);
  const isLoading = useAppStore((s) => s.isLoadingCompare);

  const a = compareIds[0] ? summaries[compareIds[0]] : null;
  const b = compareIds[1] ? summaries[compareIds[1]] : null;

  const hasBoth = !!(a && b);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-900/40 p-6">
      <div className="flex items-baseline justify-between pr-10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          Comparison
        </p>
        {hasBoth && (
          <button
            onClick={onOpenFullscreen}
            className="font-mono text-[10px] uppercase tracking-widest text-accent hover:text-accent/80"
          >
            Open ↗
          </button>
        )}
      </div>

      {!hasBoth ? (
        <div className="mt-6 flex flex-col items-start gap-4">
          <div>
            <p className="font-display text-2xl italic leading-tight text-stone-300">
              Compare two sessions
            </p>
            <p className="mt-2 font-sans text-xs text-stone-500">
              See hits overlaid and track how you&apos;ve improved between
              practice sessions.
            </p>
          </div>
          <button
            onClick={onOpenFullscreen}
            className="rounded-full border border-accent/60 bg-accent/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-accent transition-colors hover:bg-accent/20"
          >
            Pick 2 sessions →
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {/* Legend */}
          <div className="flex items-center gap-4 pb-1">
            <Legend label={a!.label} color={COMPARE_COLOR_A} />
            <span className="font-mono text-[10px] text-stone-600">vs</span>
            <Legend label={b!.label} color={COMPARE_COLOR_B} />
          </div>

          {isLoading ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
              Loading...
            </p>
          ) : (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2">
              <StatRow
                labelA="Hits"
                valueA={a!.hitCount}
                valueB={b!.hitCount}
                higherIsBetter
              />
              <StatRow
                labelA="Sweet %"
                valueA={Math.round(a!.sweetPct)}
                valueB={Math.round(b!.sweetPct)}
                suffix="%"
                higherIsBetter
              />
              <StatRow
                labelA="Max force"
                valueA={Math.round(a!.maxForce)}
                valueB={Math.round(b!.maxForce)}
                higherIsBetter
              />
              <StatRow
                labelA="Duration"
                valueA={a!.durationMs}
                valueB={b!.durationMs}
                formatter={formatDurationShort}
                higherIsBetter={false}
                neutralOnly
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="font-sans text-xs text-stone-300">{label}</span>
    </div>
  );
}

function StatRow({
  labelA,
  valueA,
  valueB,
  suffix,
  higherIsBetter,
  formatter,
  neutralOnly,
}: {
  labelA: string;
  valueA: number | null;
  valueB: number | null;
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

  let deltaText = "";
  let deltaColor = "text-stone-500";
  if (valueA !== null && valueB !== null && !neutralOnly) {
    const delta = valueB - valueA;
    if (delta !== 0) {
      const sign = delta > 0 ? "+" : "";
      deltaText = `${sign}${Math.round(delta).toLocaleString()}${suffix ?? ""}`;
      const isImprovement = higherIsBetter ? delta > 0 : delta < 0;
      deltaColor = isImprovement ? "text-emerald-400" : "text-rose-400";
    } else {
      deltaText = "—";
    }
  }

  return (
    <>
      <div className="flex flex-col items-start">
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          {labelA}
        </span>
        <span className="font-display text-xl italic text-stone-100">
          {fmt(valueA)}
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-600">
          Δ
        </span>
        <motion.span
          key={deltaText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`font-mono text-xs ${deltaColor}`}
        >
          {deltaText || "—"}
        </motion.span>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          &nbsp;
        </span>
        <span className="font-display text-xl italic text-stone-100">
          {fmt(valueB)}
        </span>
      </div>
    </>
  );
}

function formatDurationShort(ms: number | null): string {
  if (ms === null) return "—";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
