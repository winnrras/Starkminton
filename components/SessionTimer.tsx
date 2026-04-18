"use client";

import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";

export function SessionTimer() {
  const session = useAppStore((s) => s.activeSession);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) {
    return (
      <div className="flex flex-col">
        <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
          Session
        </span>
        <span className="font-display text-2xl italic text-stone-600">
          Not started
        </span>
      </div>
    );
  }

  const endTime = session.endedAt ?? now;
  const elapsed = Math.max(0, endTime - session.startedAt);
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;

  const startedStr = new Date(session.startedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {session.endedAt ? "Ended session" : "Live session"}
      </span>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl italic text-stone-100 tabular-nums">
          {timeStr}
        </span>
        <span className="font-mono text-[10px] text-stone-500">
          started {startedStr}
        </span>
      </div>
    </div>
  );
}
