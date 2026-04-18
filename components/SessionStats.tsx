"use client";

import { useAppStore } from "@/lib/store";

export function SessionStats() {
  const session = useAppStore((s) => s.activeSession);

  const sweetPct =
    session && session.hitCount > 0
      ? Math.round((session.sweetCount / session.hitCount) * 100)
      : 0;

  return (
    <div className="rounded-3xl border border-ink-700 bg-ink-900/40 p-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        Session
      </p>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Stat label="Hits" value={session?.hitCount ?? 0} />
        <Stat label="Sweet %" value={sweetPct} suffix="%" />
        <Stat
          label="Max force"
          value={session ? Math.round(session.maxForce) : 0}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </span>
      <span className="mt-1 font-display text-3xl italic text-stone-100">
        {value.toLocaleString()}
        {suffix && (
          <span className="ml-0.5 font-mono text-base not-italic text-stone-500">
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
}
