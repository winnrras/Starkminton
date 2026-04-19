"use client";

import { create } from "zustand";
import type {
  ConnectionState,
  ConnectionStatus,
  HitData,
  SessionData,
} from "./types";

export interface SavedSession {
  id: string;
  name: string | null;
  startedAt: number;
  endedAt: number | null;
}

export interface SessionSummary {
  id: string;
  label: string;
  hitCount: number;
  sweetCount: number;
  sweetPct: number;
  maxForce: number;
  avgForce: number;
  durationMs: number | null;
  hits: HitData[];
}

const COMPARE_STORAGE_KEY = "starkminton:compareIds";

function loadCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string").slice(0, 2);
  } catch {
    return [];
  }
}

function saveCompareIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

interface AppState {
  connection: ConnectionState;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setDeviceName: (name: string | null) => void;
  setMockMode: (on: boolean) => void;

  activeSession: SessionData | null;
  startSession: () => void;
  endSession: () => void;
  saveActiveSession: () => Promise<{ ok: boolean; error?: string }>;
  discardActiveSession: () => void;

  hits: HitData[];
  addHit: (hit: Omit<HitData, "id" | "recordedAt">) => void;
  setHits: (hits: HitData[]) => void;
  clearHits: () => void;

  savedSessions: SavedSession[];
  fetchSavedSessions: () => Promise<void>;
  isLoadingSessions: boolean;

  // Viewing one session in fullscreen (single)
  viewingSessionId: string | null;
  viewingHits: HitData[];
  setViewingSession: (id: string | null) => Promise<void>;
  isLoadingViewingHits: boolean;

  // Compare mode
  compareMode: boolean;
  setCompareMode: (on: boolean) => void;
  compareSessionIds: string[]; // ordered, LIFO capped at 2
  toggleCompareSession: (id: string) => Promise<void>;
  clearCompareSessions: () => void;
  compareSummaries: Record<string, SessionSummary>;
  isLoadingCompare: boolean;
  /** Call on app load to rehydrate last comparison from localStorage */
  rehydrateCompare: () => Promise<void>;

  /** Delete a saved session from Turso and clean local state */
  deleteSession: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

async function fetchSessionSummary(
  id: string,
  label: string
): Promise<SessionSummary | null> {
  try {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    const hits: HitData[] = (data.hits || []).map((h: any) => ({
      id: h.id,
      x: h.x,
      y: h.y,
      force: h.force,
      sweet: typeof h.sweet === "boolean" ? h.sweet : null,
      deviceTimestamp: h.deviceTimestamp ?? undefined,
      recordedAt: new Date(h.recordedAt).getTime(),
    }));
    const session = data.session;
    const hitCount = hits.length;
    const sweetCount = hits.filter((h) => h.sweet).length;
    const maxForce = hits.reduce((m, h) => Math.max(m, h.force), 0);
    const avgForce =
      hitCount > 0 ? hits.reduce((s, h) => s + h.force, 0) / hitCount : 0;
    const startedAt = new Date(session.startedAt).getTime();
    const endedAt = session.endedAt ? new Date(session.endedAt).getTime() : null;
    const durationMs = endedAt ? endedAt - startedAt : null;

    return {
      id,
      label,
      hitCount,
      sweetCount,
      sweetPct: hitCount > 0 ? (sweetCount / hitCount) * 100 : 0,
      maxForce,
      avgForce,
      durationMs,
      hits,
    };
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  connection: {
    status: "idle",
    deviceName: null,
    error: null,
    mockMode: false,
  },
  setConnectionStatus: (status, error) =>
    set((state) => ({
      connection: { ...state.connection, status, error: error ?? null },
    })),
  setDeviceName: (name) =>
    set((state) => ({ connection: { ...state.connection, deviceName: name } })),
  setMockMode: (on) =>
    set((state) => ({ connection: { ...state.connection, mockMode: on } })),

  activeSession: null,
  startSession: () => {
    const now = Date.now();
    const id = `s_${now}_${Math.random().toString(36).slice(2, 8)}`;
    set({
      activeSession: {
        id,
        name: null,
        startedAt: now,
        endedAt: null,
        hitCount: 0,
        sweetCount: 0,
        avgForce: 0,
        maxForce: 0,
      },
      hits: [],
    });
  },
  endSession: () =>
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: { ...state.activeSession, endedAt: Date.now() },
      };
    }),
  saveActiveSession: async () => {
    const state = get();
    const session = state.activeSession;
    if (!session) return { ok: false, error: "No active session" };
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          name: session.name,
          startedAt: session.startedAt,
          endedAt: session.endedAt ?? Date.now(),
          hits: state.hits,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }
      set({ activeSession: null, hits: [] });
      await get().fetchSavedSessions();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || "Network error" };
    }
  },
  discardActiveSession: () => set({ activeSession: null, hits: [] }),

  hits: [],
  addHit: (hit) => {
    const now = Date.now();
    const newHit: HitData = {
      ...hit,
      id: `h_${now}_${Math.random().toString(36).slice(2, 8)}`,
      recordedAt: now,
    };
    set((state) => {
      const nextHits = [...state.hits, newHit];
      const session = state.activeSession;
      if (!session) return { hits: nextHits };
      const hitCount = session.hitCount + 1;
      const sweetCount = session.sweetCount + (newHit.sweet ? 1 : 0);
      const totalForce = session.avgForce * session.hitCount + newHit.force;
      return {
        hits: nextHits,
        activeSession: {
          ...session,
          hitCount,
          sweetCount,
          avgForce: totalForce / hitCount,
          maxForce: Math.max(session.maxForce, newHit.force),
        },
      };
    });
  },
  setHits: (hits) => set({ hits }),
  clearHits: () => set({ hits: [] }),

  savedSessions: [],
  isLoadingSessions: false,
  fetchSavedSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows: SavedSession[] = (data.sessions || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        startedAt: new Date(s.startedAt).getTime(),
        endedAt: s.endedAt ? new Date(s.endedAt).getTime() : null,
      }));
      set({ savedSessions: rows });
    } catch (e) {
      console.error("Failed to fetch sessions", e);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  viewingSessionId: null,
  viewingHits: [],
  isLoadingViewingHits: false,
  setViewingSession: async (id) => {
    if (id === null) {
      set({ viewingSessionId: null, viewingHits: [] });
      return;
    }
    set({ viewingSessionId: id, isLoadingViewingHits: true, viewingHits: [] });
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hits: HitData[] = (data.hits || []).map((h: any) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        force: h.force,
        sweet: typeof h.sweet === "boolean" ? h.sweet : null,
        deviceTimestamp: h.deviceTimestamp ?? undefined,
        recordedAt: new Date(h.recordedAt).getTime(),
      }));
      set({ viewingHits: hits });
    } catch (e) {
      console.error("Failed to fetch session hits", e);
    } finally {
      set({ isLoadingViewingHits: false });
    }
  },

  // Compare mode
  compareMode: false,
  setCompareMode: (on) => set({ compareMode: on }),
  compareSessionIds: [],
  compareSummaries: {},
  isLoadingCompare: false,

  toggleCompareSession: async (id) => {
    const state = get();
    let nextIds = [...state.compareSessionIds];
    if (nextIds.includes(id)) {
      nextIds = nextIds.filter((x) => x !== id);
    } else {
      // LIFO cap at 2: drop the oldest (first)
      nextIds.push(id);
      if (nextIds.length > 2) nextIds = nextIds.slice(-2);
    }
    saveCompareIds(nextIds);
    set({ compareSessionIds: nextIds });

    // Fetch any summaries we don't already have
    const missing = nextIds.filter((x) => !get().compareSummaries[x]);
    if (missing.length > 0) {
      set({ isLoadingCompare: true });
      const saved = get().savedSessions;
      const fetched = await Promise.all(
        missing.map((mid) => {
          const s = saved.find((x) => x.id === mid);
          const label = s ? formatSessionLabelForStore(s.startedAt) : "Session";
          return fetchSessionSummary(mid, label);
        })
      );
      set((prev) => {
        const next = { ...prev.compareSummaries };
        fetched.forEach((sum) => {
          if (sum) next[sum.id] = sum;
        });
        return { compareSummaries: next, isLoadingCompare: false };
      });
    }
  },

  clearCompareSessions: () => {
    saveCompareIds([]);
    set({ compareSessionIds: [] });
  },

  rehydrateCompare: async () => {
    const ids = loadCompareIds();
    if (ids.length === 0) return;
    // Ensure we have savedSessions list first so labels render correctly
    if (get().savedSessions.length === 0) {
      await get().fetchSavedSessions();
    }
    const saved = get().savedSessions;
    const validIds = ids.filter((id) => saved.some((s) => s.id === id));
    if (validIds.length === 0) {
      saveCompareIds([]);
      return;
    }
    set({ compareSessionIds: validIds, isLoadingCompare: true });
    const fetched = await Promise.all(
      validIds.map((id) => {
        const s = saved.find((x) => x.id === id)!;
        return fetchSessionSummary(id, formatSessionLabelForStore(s.startedAt));
      })
    );
    set((prev) => {
      const next = { ...prev.compareSummaries };
      fetched.forEach((sum) => {
        if (sum) next[sum.id] = sum;
      });
      return { compareSummaries: next, isLoadingCompare: false };
    });
  },

  deleteSession: async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }

      set((state) => {
        // Remove from saved list
        const savedSessions = state.savedSessions.filter((s) => s.id !== id);

        // If the deleted one was being viewed, reset to live
        const viewingSessionId =
          state.viewingSessionId === id ? null : state.viewingSessionId;
        const viewingHits =
          state.viewingSessionId === id ? [] : state.viewingHits;

        // Clean up comparison state
        const nextCompareIds = state.compareSessionIds.filter((x) => x !== id);
        if (nextCompareIds.length !== state.compareSessionIds.length) {
          saveCompareIds(nextCompareIds);
        }
        const nextSummaries = { ...state.compareSummaries };
        delete nextSummaries[id];

        return {
          savedSessions,
          viewingSessionId,
          viewingHits,
          compareSessionIds: nextCompareIds,
          compareSummaries: nextSummaries,
        };
      });

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || "Network error" };
    }
  },
}));

function formatSessionLabelForStore(startedAtMs: number): string {
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
