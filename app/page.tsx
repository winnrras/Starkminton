"use client";

import { AICoach } from "@/components/AICoach";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { ExportSession } from "@/components/ExportSession";
import { FullscreenSessionBrowser } from "@/components/FullscreenSessionBrowser";
import { FullscreenableCard } from "@/components/FullscreenableCard";
import { HitHistory } from "@/components/HitHistory";
import { LatestHitCard } from "@/components/LatestHitCard";
import { RacketHeatmap } from "@/components/RacketHeatmap";
import { SessionComparison } from "@/components/SessionComparison";
import { SessionControls } from "@/components/SessionControls";
import { SessionStats } from "@/components/SessionStats";
import { SessionTimer } from "@/components/SessionTimer";
import { SplashScreen } from "@/components/SplashScreen";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function Home() {
  const hits = useAppStore((s) => s.hits);
  const latestHitId = hits.length > 0 ? hits[hits.length - 1].id : null;
  const rehydrateCompare = useAppStore((s) => s.rehydrateCompare);
  const setCompareMode = useAppStore((s) => s.setCompareMode);

  const [heatmapFullscreen, setHeatmapFullscreen] = useState(false);

  useEffect(() => {
    rehydrateCompare();
  }, [rehydrateCompare]);

  function openCompareInFullscreen() {
    setCompareMode(true);
    setHeatmapFullscreen(true);
  }

  return (
    <>
      <SplashScreen />
      <main className="min-h-screen px-6 py-8 lg:px-12 lg:py-10">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-accent">
              Starkminton
            </p>
            <h1 className="mt-2 font-display text-5xl italic leading-none text-stone-100 lg:text-6xl">
              Smash<span className="text-stone-600">.</span>
            </h1>
            <p className="mt-3 max-w-md font-sans text-sm text-stone-400">
              Real-time racket analytics. Track every hit — force, location, and
              sweet-spot precision.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <SessionTimer />
            <SessionControls />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left — hero racket heatmap */}
          <section className="order-2 lg:order-1 lg:col-span-7">
            <FullscreenableCard
              fullscreenTitle="Strike map"
              fullscreenContent={<FullscreenSessionBrowser />}
              isOpen={heatmapFullscreen}
              onOpenChange={setHeatmapFullscreen}
            >
              <div className="rounded-3xl border border-ink-700 bg-gradient-to-b from-ink-900 to-ink-950 p-6 lg:p-10">
                <div className="flex items-baseline justify-between pr-10">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Strike map
                    </p>
                    <h2 className="mt-1 font-display text-2xl italic text-stone-200">
                      Impact locations
                    </h2>
                  </div>
                  <Legend />
                </div>

                <div className="mx-auto mt-4 aspect-[5/7] w-full max-w-[460px]">
                  <RacketHeatmap hits={hits} latestHitId={latestHitId} />
                </div>

                <div className="mt-6 flex justify-center border-t border-ink-800 pt-5">
                  <ExportSession />
                </div>
              </div>
            </FullscreenableCard>
          </section>

          {/* Right — stacked cards */}
          <section className="order-1 flex flex-col gap-4 lg:order-2 lg:col-span-5">
            <ConnectionPanel />
            <FullscreenableCard fullscreenTitle="Latest hit">
              <LatestHitCard />
            </FullscreenableCard>
            <FullscreenableCard fullscreenTitle="Session stats">
              <SessionStats />
            </FullscreenableCard>
            <SessionComparison onOpenFullscreen={openCompareInFullscreen} />
            <AICoach />
          </section>

          {/* Full-width hit history */}
          <section className="order-3 lg:col-span-12">
            <FullscreenableCard fullscreenTitle="Hit history">
              <HitHistory />
            </FullscreenableCard>
          </section>
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
            Team Starkminton — hackathon ed.
          </p>
          <p className="font-mono text-[10px] text-stone-600">
            web bluetooth · turso · next
          </p>
        </footer>
      </main>
    </>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4">
      <LegendDot label="Sweet" filled />
      <LegendDot label="Off-spot" />
    </div>
  );
}

function LegendDot({
  label,
  filled = false,
}: {
  label: string;
  filled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${
          filled ? "bg-accent" : "border border-stone-400"
        }`}
      />
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </span>
    </div>
  );
}
