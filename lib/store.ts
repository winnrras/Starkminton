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

interface AppState {
  // Connection
  connection: ConnectionState;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setDeviceName: (name: string | null) => void;
  setMockMode: (on: boolean) => void;

  // Active (live) session
  activeSession: SessionData | null;
  startSession: () => void;
  endSession: () => void;
  saveActiveSession: () => Promise<{ ok: boolean; error?: string }>;
  discardActiveSession: () => void;

  // Live hits
  hits: HitData[];
  addHit: (hit: Omit<HitData, "id" | "recordedAt">) => void;
  setHits: (hits: HitData[]) => void;
  clearHits: () => void;

  // Past saved sessions (for the fullscreen browser)
  savedSessions: SavedSession[];
  fetchSavedSessions: () => Promise<void>;
  isLoadingSessions: boolean;

  // Which session is being viewed in fullscreen browser
  // null = active live session, string = saved session id
  viewingSessionId: string | null;
  viewingHits: HitData[]; // hits for the viewing session
  setViewingSession: (id: string | null) => Promise<void>;
  isLoadingViewingHits: boolean;
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

      // Clear local state after saving
      set({ activeSession: null, hits: [] });

      // Refresh saved sessions list
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

  // Saved sessions
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

  // Viewing state (for fullscreen browser)
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
}));
