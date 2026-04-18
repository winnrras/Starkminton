"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2800);

    function handleSkip() {
      setVisible(false);
    }

    window.addEventListener("keydown", handleSkip);
    window.addEventListener("click", handleSkip);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleSkip);
      window.removeEventListener("click", handleSkip);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950"
        >
          <div className="flex flex-col items-center px-6 text-center">
            {/* Main title with staggered fade */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.9,
                delay: 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="font-display text-6xl italic leading-none text-stone-100 lg:text-8xl"
            >
              Starkminton
            </motion.h1>

            {/* Accent divider */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="my-6 h-px w-16 origin-left bg-accent"
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.85,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="max-w-md font-sans text-sm text-stone-400"
            >
              Badminton shot analytics
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.7,
                delay: 1.2,
                ease: "easeOut",
              }}
              className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-stone-600"
            >
              Created for StarkHacks 2026
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.7,
                delay: 1.4,
                ease: "easeOut",
              }}
              className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-stone-600"
            >
              Made possible by Toni Stark Team
            </motion.p>
          </div>

          {/* Skip hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2 }}
            className="absolute bottom-8 font-mono text-[10px] uppercase tracking-widest text-stone-700"
          >
            Click anywhere to continue
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
