import type { HitData } from "./types";

export interface MockGenerator {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export function createMockGenerator(
  onHit: (hit: Omit<HitData, "id" | "recordedAt">) => void
): MockGenerator {
  let interval: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  function scheduleNext() {
    // Random interval between 800ms and 2500ms — feels like a realistic rally
    const delay = 800 + Math.random() * 1700;
    interval = setTimeout(() => {
      if (!running) return;
      emitHit();
      scheduleNext();
    }, delay);
  }

  function emitHit() {
    // Bias toward the sweet spot (center) with gaussian-ish distribution
    const centerX = 0.5;
    const centerY = 0.5;
    const spread = 0.22;

    const x = clamp(centerX + gaussian() * spread, 0.05, 0.95);
    const y = clamp(centerY + gaussian() * spread, 0.05, 0.95);

    // Distance from sweet spot determines sweet flag and force curve
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const sweet = dist < 0.12 && Math.random() > 0.2;
    // Force values use the 0-4095 raw ADC range the real firmware sends,
    // so switching between mock and real hardware produces consistent numbers.
    const force = sweet
      ? 2600 + Math.random() * 1400 // 2600-4000 — clean hits, hard and loud
      : 1200 + Math.random() * 1700; // 1200-2900 — off-spot, softer

    onHit({
      x,
      y,
      force: Math.round(force * 10) / 10,
      sweet,
      deviceTimestamp: Date.now(),
    });
  }

  return {
    start() {
      if (running) return;
      running = true;
      scheduleNext();
    },
    stop() {
      running = false;
      if (interval) {
        clearTimeout(interval);
        interval = null;
      }
    },
    isRunning() {
      return running;
    },
  };
}

function gaussian(): number {
  // Box-Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
