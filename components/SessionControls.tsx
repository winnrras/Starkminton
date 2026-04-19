"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export function SessionControls() {
  const session = useAppStore((s) => s.activeSession);
  const startSession = useAppStore((s) => s.startSession);
  const endSession = useAppStore((s) => s.endSession);
  const clearHits = useAppStore((s) => s.clearHits);
  const saveActiveSession = useAppStore((s) => s.saveActiveSession);
  const discardActiveSession = useAppStore((s) => s.discardActiveSession);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setSaving(true);
    setSaveError(null);
    const result = await saveActiveSession();
    setSaving(false);
    if (!result.ok) setSaveError(result.error || "Save failed");
  }

  function handleDelete() {
    discardActiveSession();
    setSaveError(null);
  }

  return (
    <div className="flex flex-col items-end gap-2">
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
              isDisabled={saving}
              className="h-9 min-w-0 rounded-full bg-accent px-5 text-xs font-medium text-ink-950 hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save session"}
            </Button>
            <Button
              onClick={handleDelete}
              isDisabled={saving}
              variant="flat"
              className="h-9 min-w-0 rounded-full border border-red-900/60 bg-transparent px-4 text-xs text-red-400 hover:bg-red-950/40"
            >
              Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {saveError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-[10px] text-red-400"
        >
          {saveError}
        </motion.p>
      )}
    </div>
  );
}
