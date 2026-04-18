"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

interface FullscreenableCardProps {
  children: React.ReactNode;
  /** Content to show in fullscreen mode. If omitted, uses children. */
  fullscreenContent?: React.ReactNode;
  /** Optional title shown above the fullscreen content */
  fullscreenTitle?: string;
  /** Optional className for the card shell */
  className?: string;
}

/**
 * Wraps a card and adds a fullscreen expand button.
 * When clicked, the card morphs into a fullscreen overlay using Framer Motion's
 * shared layout animation (Apple-like effect).
 */
export function FullscreenableCard({
  children,
  fullscreenContent,
  fullscreenTitle,
  className = "",
}: FullscreenableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const layoutId = useId();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    // Prevent body scroll while fullscreen
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Normal-size card */}
      <motion.div
        layoutId={`card-${layoutId}`}
        className={`relative ${className}`}
      >
        {children}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Expand to fullscreen"
          className="group absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-ink-700 bg-ink-900/80 text-stone-500 backdrop-blur transition-colors hover:border-accent/60 hover:text-accent"
        >
          <ExpandIcon />
        </button>
      </motion.div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-ink-950/90 backdrop-blur-xl"
            />

            {/* Fullscreen content */}
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6 lg:p-10">
              <motion.div
                layoutId={`card-${layoutId}`}
                className="pointer-events-auto relative flex h-full max-h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-3xl border border-ink-700 bg-gradient-to-b from-ink-900 to-ink-950"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-ink-800 px-6 py-4 lg:px-10">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                      Focus mode
                    </p>
                    {fullscreenTitle && (
                      <h2 className="mt-1 font-display text-2xl italic text-stone-100 lg:text-3xl">
                        {fullscreenTitle}
                      </h2>
                    )}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label="Close fullscreen"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 bg-ink-800/60 text-stone-400 transition-colors hover:border-stone-500 hover:text-stone-100"
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 lg:p-10">
                  {fullscreenContent ?? children}
                </div>

                {/* Footer hint */}
                <div className="border-t border-ink-800 px-6 py-3 lg:px-10">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-stone-600">
                    Press <kbd className="rounded border border-ink-700 bg-ink-900 px-1.5 py-0.5 text-stone-400">Esc</kbd> to close
                  </p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 1h4v4" />
      <path d="M1 7v4h4" />
      <path d="M11 1l-5 5" />
      <path d="M1 11l5-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  );
}
