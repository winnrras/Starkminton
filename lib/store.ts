"use client";

import { create } from "zustand";
import type {
  ConnectionState,
  ConnectionStatus,
  HitData,
  SessionData,
} from "./types";

interface AppState {
  // Connection
  connection: ConnectionState;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setDeviceName: (name: string | null) => void;
  setMockMode: (on: boolean) => void;

  // Session
  activeSession: SessionData | null;
  startSession: () => void;
  endSession: () => void;

  // Hits
  hits: HitData[];
  addHit: (hit: Omit<HitData, "id" | "recordedAt">) => void;
  setHits: (hits: HitData[]) => void;
  clearHits: () => void;
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
      connection: {
        ...state.connection,
        status,
        error: error ?? null,
      },
    })),

  setDeviceName: (name) =>
    set((state) => ({
      connection: { ...state.connection, deviceName: name },
    })),

  setMockMode: (on) =>
    set((state) => ({
      connection: { ...state.connection, mockMode: on },
    })),

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

  endSession: () => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          endedAt: Date.now(),
        },
      };
    });
  },

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
}));
