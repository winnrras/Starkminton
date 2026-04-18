"use client";

import type { HitData } from "@/lib/types";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface RacketHeatmapProps {
  hits: HitData[];
  latestHitId: string | null;
  /** If true, show only the racket head (string bed) — used for fullscreen focus */
  headOnly?: boolean;
}

export function RacketHeatmap({
  hits,
  latestHitId,
  headOnly = false,
}: RacketHeatmapProps) {
  const headCx = 200;
  const headCy = 170;
  const headRx = 140;
  const headRy = 160;

  const headBottomY = headCy + headRy;
  const throatTopY = headBottomY - 6;
  const throatBottomY = headBottomY + 40;
  const shaftTopY = throatBottomY;
  const shaftBottomY = 620;
  const shaftWidth = 6;
  const gripTopY = shaftBottomY;
  const gripBottomY = 780;
  const gripWidth = 28;

  const mapCoord = useMemo(
    () => (x: number, y: number) => ({
      cx: headCx - headRx + x * (headRx * 2),
      cy: headCy - headRy + y * (headRy * 2),
    }),
    []
  );

  const viewBox = headOnly
    ? `${headCx - headRx - 20} ${headCy - headRy - 20} ${headRx * 2 + 40} ${headRy * 2 + 40}`
    : "0 0 400 800";

  const suffix = headOnly ? "full" : "mini";

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id={`strings-${suffix}`}
            x="0"
            y="0"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 12 0 L 0 0 0 12"
              fill="none"
              stroke="#1a1d24"
              strokeWidth="0.8"
            />
          </pattern>

          <radialGradient id={`sweetGlow-${suffix}`}>
            <stop offset="0%" stopColor="#d9ff3f" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#d9ff3f" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#d9ff3f" stopOpacity="0" />
          </radialGradient>

          <clipPath id={`stringBedClip-${suffix}`}>
            <ellipse
              cx={headCx}
              cy={headCy}
              rx={headRx - 4}
              ry={headRy - 4}
            />
          </clipPath>

          <pattern
            id={`gripTape-${suffix}`}
            x="0"
            y="0"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-20)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="#3a3f4b"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* String bed fill */}
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx - 4}
          ry={headRy - 4}
          fill="#0f1116"
        />

        {/* Sweet spot glow */}
        <circle
          cx={headCx}
          cy={headCy + 12}
          r="60"
          fill={`url(#sweetGlow-${suffix})`}
          clipPath={`url(#stringBedClip-${suffix})`}
        />

        {/* Strings */}
        <g clipPath={`url(#stringBedClip-${suffix})`}>
          <rect
            x={headCx - headRx}
            y={headCy - headRy}
            width={headRx * 2}
            height={headRy * 2}
            fill={`url(#strings-${suffix})`}
          />
        </g>

        {/* Head frame outer */}
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx}
          ry={headRy}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth="2.5"
        />

        {/* Head frame inner */}
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx - 4}
          ry={headRy - 4}
          fill="none"
          stroke="#3a3f4b"
          strokeWidth="0.5"
        />

        {/* Throat + shaft + grip — only in normal mode */}
        {!headOnly && (
          <>
            <path
              d={`
                M ${headCx - 48} ${throatTopY}
                Q ${headCx - 34} ${throatTopY + 20}, ${headCx - shaftWidth / 2} ${throatBottomY}
                L ${headCx + shaftWidth / 2} ${throatBottomY}
                Q ${headCx + 34} ${throatTopY + 20}, ${headCx + 48} ${throatTopY}
              `}
              fill="none"
              stroke="#f5f5f4"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <rect
              x={headCx - shaftWidth / 2}
              y={shaftTopY}
              width={shaftWidth}
              height={shaftBottomY - shaftTopY}
              fill="none"
              stroke="#f5f5f4"
              strokeWidth="2.5"
            />
            <rect
              x={headCx - gripWidth / 2}
              y={gripTopY}
              width={gripWidth}
              height={gripBottomY - gripTopY}
              fill={`url(#gripTape-${suffix})`}
              stroke="#f5f5f4"
              strokeWidth="2.5"
              rx="4"
            />
            <rect
              x={headCx - gripWidth / 2 - 3}
              y={gripBottomY - 8}
              width={gripWidth + 6}
              height="8"
              fill="#1a1d24"
              stroke="#f5f5f4"
              strokeWidth="2.5"
              rx="2"
            />
          </>
        )}

        {/* Center crosshair */}
        <g opacity="0.3">
          <line
            x1={headCx - 8}
            y1={headCy + 12}
            x2={headCx + 8}
            y2={headCy + 12}
            stroke="#d9ff3f"
            strokeWidth="0.5"
          />
          <line
            x1={headCx}
            y1={headCy + 4}
            x2={headCx}
            y2={headCy + 20}
            stroke="#d9ff3f"
            strokeWidth="0.5"
          />
        </g>

        {/* Hit dots */}
        <g clipPath={`url(#stringBedClip-${suffix})`}>
          {hits.map((hit, i) => {
            const { cx, cy } = mapCoord(hit.x, hit.y);
            const isLatest = hit.id === latestHitId;
            const age = hits.length - 1 - i;
            const opacity = Math.max(0.15, 1 - age * 0.04);

            const baseRadius = headOnly ? 6 : 4;
            const latestRadius = headOnly ? 8 : 5.5;
            const pulseMaxR = headOnly ? 48 : 32;

            return (
              <g key={hit.id}>
                {isLatest && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={latestRadius}
                    fill="none"
                    stroke="#d9ff3f"
                    strokeWidth="1.5"
                    initial={{ r: latestRadius, opacity: 1 }}
                    animate={{ r: pulseMaxR, opacity: 0 }}
                    transition={{
                      duration: 1.3,
                      ease: "easeOut",
                    }}
                  />
                )}
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? latestRadius : baseRadius}
                  fill={hit.sweet ? "#d9ff3f" : "transparent"}
                  stroke={hit.sweet ? "#d9ff3f" : "#f5f5f4"}
                  strokeWidth={hit.sweet ? 0 : 1.5}
                  opacity={opacity}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity }}
                  transition={{
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
