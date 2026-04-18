"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

export function SessionControls() {
  const session = useAppStore((s) => s.activeSession);
  const startSession = useAppStore((s) => s.startSession);
  const endSession = useAppStore((s) => s.endSession);
  const clearHits = useAppStore((s) => s.clearHits);

  const isActive = session && !session.endedAt;
  const isEnded = session && session.endedAt;

  function handleStart() {
    clearHits();
    startSession();
  }

  function handleEnd() {
    endSession();
  }

  function handleReset() {
    clearHits();
    startSession();
  }

  async function handleSave() {
    // TODO: wire to /api/sessions POST endpoint
    // For now just clear and go idle
    clearHits();
    useAppStore.setState({ activeSession: null });
  }

  function handleDelete() {
    clearHits();
    useAppStore.setState({ activeSession: null });
  }

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {!session ? (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={handleStart}
              className="h-9 min-w-0 rounded-full bg-accent px-5 text-xs font-medium text-ink-950 hover:bg-accent/90"
            >
              Start session
            </Button>
          </motion.div>
        ) : isActive ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Button
              onClick={handleEnd}
              variant="flat"
              className="h-9 min-w-0 rounded-full border border-ink-700 bg-transparent px-4 text-xs text-stone-300 hover:bg-ink-800"
            >
              End session
            </Button>
            <Button
              onClick={handleReset}
              variant="flat"
              className="h-9 min-w-0 rounded-full border border-ink-700 bg-transparent px-4 text-xs text-stone-400 hover:bg-ink-800"
            >
              Reset heatmap
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Button
              onClick={handleSave}
              className="h-9 min-w-0 rounded-full bg-accent px-5 text-xs font-medium text-ink-950 hover:bg-accent/90"
            >
              Save session
            </Button>
            <Button
              onClick={handleDelete}
              variant="flat"
              className="h-9 min-w-0 rounded-full border border-red-900/60 bg-transparent px-4 text-xs text-red-400 hover:bg-red-950/40"
            >
              Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
