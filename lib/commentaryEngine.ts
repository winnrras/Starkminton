"use client";

import type { CommentaryTag } from "./commentary";
import type { HitData } from "./types";

interface CommentaryClip {
  tag: CommentaryTag;
  text: string;
  audioBlobUrl: string;
}

export interface CommentaryEngine {
  /** Fetch all clips from the API and cache blob URLs. Call once at app load. */
  load: () => Promise<{ ok: boolean; error?: string }>;

  /** Called by the app every time a hit is added. Fires commentary on cadence. */
  onHit: (hits: HitData[]) => void;

  /** Called on session reset so internal counters clear. */
  reset: () => void;

  /** Mute control. */
  setMuted: (m: boolean) => void;
  isMuted: () => boolean;

  /** State queries for UI. */
  isLoaded: () => boolean;
  isSpeaking: () => boolean;

  /** Subscribe to speaking-state changes (for waveform UI). */
  onSpeakingChange: (cb: (speaking: boolean) => void) => () => void;
}

const TRIGGER_EVERY_N_HITS = 5;
const AMBIENT_INTERVAL_MS = 45_000; // 45s of no commentary -> play ambient

export function createCommentaryEngine(): CommentaryEngine {
  let clips: CommentaryClip[] = [];
  let loaded = false;
  let muted = true;
  let hitsSinceLastLine = 0;
  let speaking = false;
  let currentAudio: HTMLAudioElement | null = null;
  let lastCommentaryAt = 0;
  let ambientTimer: ReturnType<typeof setInterval> | null = null;
  let lastHits: HitData[] = [];

  const speakingListeners = new Set<(speaking: boolean) => void>();

  function setSpeaking(v: boolean) {
    speaking = v;
    speakingListeners.forEach((cb) => cb(v));
  }

  async function load() {
    try {
      const res = await fetch("/api/voice/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }

      // Convert each base64 MP3 into a blob URL the <audio> element can use.
      clips = (data.clips || []).map((c: any) => {
        const bytes = base64ToBytes(c.audio);
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        return { tag: c.tag, text: c.text, audioBlobUrl: url };
      });
      loaded = true;

      // Start ambient timer
      startAmbientTimer();

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || "Load failed" };
    }
  }

  function startAmbientTimer() {
    if (ambientTimer) clearInterval(ambientTimer);
    ambientTimer = setInterval(() => {
      const sinceLast = Date.now() - lastCommentaryAt;
      if (sinceLast < AMBIENT_INTERVAL_MS) return;
      if (speaking) return;
      if (!loaded || muted) return;
      // Don't play ambient if there's been no activity in a while — no point talking to nobody
      if (lastHits.length === 0) return;
      playByTag("ambient");
    }, 8_000);
  }

  function onHit(hits: HitData[]) {
    lastHits = hits;
    hitsSinceLastLine += 1;

    if (hitsSinceLastLine < TRIGGER_EVERY_N_HITS) return;
    hitsSinceLastLine = 0;

    if (!loaded || muted) return;

    const tag = pickTagFromContext(hits);
    playByTag(tag);
  }

  function reset() {
    hitsSinceLastLine = 0;
    lastHits = [];
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    setSpeaking(false);
  }

  function playByTag(tag: CommentaryTag) {
    const candidates = clips.filter((c) => c.tag === tag);
    if (candidates.length === 0) {
      // Fallback to ambient if requested tag has no clips
      const fallback = clips.filter((c) => c.tag === "ambient");
      if (fallback.length === 0) return;
      playClip(fallback[Math.floor(Math.random() * fallback.length)]);
      return;
    }
    playClip(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  function playClip(clip: CommentaryClip) {
    // Never overlap — if something is playing, skip new.
    if (speaking) return;
    if (muted) return;

    const audio = new Audio(clip.audioBlobUrl);
    currentAudio = audio;
    setSpeaking(true);
    lastCommentaryAt = Date.now();

    audio.onended = () => {
      setSpeaking(false);
      currentAudio = null;
    };
    audio.onerror = () => {
      console.error("Commentary playback error");
      setSpeaking(false);
      currentAudio = null;
    };

    audio.play().catch((e) => {
      // Autoplay may be blocked until first user gesture. Fail silently —
      // user will need to interact with the page first.
      console.warn("Commentary autoplay blocked:", e);
      setSpeaking(false);
      currentAudio = null;
    });
  }

  function setMuted(m: boolean) {
    muted = m;
    if (m && currentAudio) {
      currentAudio.pause();
      currentAudio = null;
      setSpeaking(false);
    }
  }

  return {
    load,
    onHit,
    reset,
    setMuted,
    isMuted: () => muted,
    isLoaded: () => loaded,
    isSpeaking: () => speaking,
    onSpeakingChange: (cb) => {
      speakingListeners.add(cb);
      return () => speakingListeners.delete(cb);
    },
  };
}

/**
 * Given the full hit history, pick the most relevant commentary tag.
 * Order matters — more specific/interesting conditions checked first.
 */
function pickTagFromContext(hits: HitData[]): CommentaryTag {
  const total = hits.length;
  const last = hits[hits.length - 1];

  // Milestones trump other tags
  if (total === 50) return "milestone_50";
  if (total === 25) return "milestone_25";
  if (total === 10) return "milestone_10";

  // Force-based standalone tags (from latest hit)
  if (last && last.force > 3000) return "high_force";
  if (last && last.force > 0 && last.force < 1500) return "low_force";

  // Look at the last 5 hits for patterns
  const windowSize = 5;
  const window = hits.slice(-windowSize);
  const sweetInWindow = window.filter((h) => h.sweet).length;

  // Streak: 3+ consecutive sweet at the tail
  let tailStreak = 0;
  for (let i = hits.length - 1; i >= 0; i--) {
    if (hits[i].sweet) tailStreak += 1;
    else break;
  }
  if (tailStreak >= 3) return "streak_sweet";

  // First sweet after at least 4 misses
  if (last?.sweet) {
    const prev4 = hits.slice(-5, -1);
    if (prev4.length >= 3 && prev4.every((h) => !h.sweet)) {
      return "first_sweet";
    }
  }

  // Window-based
  if (window.length >= 3) {
    if (sweetInWindow >= 4) return "mostly_sweet";
    if (sweetInWindow <= 1) return "mostly_off";
    return "mixed";
  }

  return "ambient";
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
