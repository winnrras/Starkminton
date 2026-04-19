"use client";

import type { HitData } from "@/lib/types";
import { motion } from "framer-motion";
import { useMemo } from "react";

type Orientation = "vertical" | "horizontal";

interface RacketHeatmapProps {
  hits: HitData[];
  latestHitId: string | null;
  /** Show only the head (and throat in horizontal) — used in fullscreen */
  headOnly?: boolean;
  /** "vertical" = default, head at top. "horizontal" = head on left, shaft to the right. */
  orientation?: Orientation;
}

export function RacketHeatmap({
  hits,
  latestHitId,
  headOnly = false,
  orientation = "vertical",
}: RacketHeatmapProps) {
  if (orientation === "horizontal") {
    return (
      <RacketHorizontal
        hits={hits}
        latestHitId={latestHitId}
        headOnly={headOnly}
      />
    );
  }
  return (
    <RacketVertical
      hits={hits}
      latestHitId={latestHitId}
      headOnly={headOnly}
    />
  );
}

/* ─────────────── Vertical (original) ─────────────── */

function RacketVertical({
  hits,
  latestHitId,
  headOnly,
}: {
  hits: HitData[];
  latestHitId: string | null;
  headOnly: boolean;
}) {
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
    ? `${headCx - headRx - 20} ${headCy - headRy - 20} ${headRx * 2 + 40} ${
        headRy * 2 + 40
      }`
    : "0 0 400 800";

  const suffix = headOnly ? "v-full" : "v-mini";

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <RacketDefs suffix={suffix} />
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

        {/* Head frame */}
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx}
          ry={headRy}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth="2.5"
        />
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx - 4}
          ry={headRy - 4}
          fill="none"
          stroke="#3a3f4b"
          strokeWidth="0.5"
        />

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

        {/* Crosshair */}
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

        {/* Hits */}
        <HitDots
          hits={hits}
          latestHitId={latestHitId}
          mapCoord={mapCoord}
          clipId={`stringBedClip-${suffix}`}
          baseRadius={headOnly ? 6 : 4}
          latestRadius={headOnly ? 8 : 5.5}
          pulseMaxR={headOnly ? 48 : 32}
        />
      </svg>
    </div>
  );
}

/* ─────────────── Horizontal (head on left, shaft right) ─────────────── */

function RacketHorizontal({
  hits,
  latestHitId,
  headOnly,
}: {
  hits: HitData[];
  latestHitId: string | null;
  headOnly: boolean;
}) {
  // Head dominates the left side — bigger, closer to the edge
  const headCx = 310;
  const headCy = 270;
  const headRx = 280; // wider now
  const headRy = 250; // shorter now

  // Throat starts at right edge of head, leads to shaft
  const throatLeftX = headCx + headRx - 6;
  const throatRightX = headCx + headRx + 55;
  const shaftLeftX = throatRightX;
  // Short shaft — just long enough to visually tuck under the sessions panel
  const shaftRightX = 820;
  const shaftHeight = 6;
  const gripLeftX = shaftRightX;
  const gripRightX = 980;
  const gripHeight = 28;

  /**
   * Coord remap for horizontal:
   * Original (x, y) where x=left-right of head, y=top-bottom of head.
   * Sideways with head on left:
   *   newX (left-right in display) = y  (top of head → left edge of display, bottom → right edge toward throat)
   *   newY (top-bottom in display) = 1 - x  (left in original → bottom in display)
   */
  const mapCoord = useMemo(
    () => (x: number, y: number) => {
      const displayXNorm = y; // 0 = far from throat, 1 = near throat
      const displayYNorm = 1 - x; // flipped
      return {
        cx: headCx - headRx + displayXNorm * (headRx * 2),
        cy: headCy - headRy + displayYNorm * (headRy * 2),
      };
    },
    []
  );

  const viewBox = "0 0 1000 540";
  const suffix = "h";

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <RacketDefs suffix={suffix} />
        </defs>

        {/* String bed fill */}
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx - 4}
          ry={headRy - 4}
          fill="#0f1116"
        />

        {/* Sweet spot glow — offset toward the throat side (right) since that's the "lower" part of a racket */}
        <circle
          cx={headCx + 18}
          cy={headCy}
          r="90"
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

        {/* Head frame */}
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx}
          ry={headRy}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth="2.5"
        />
        <ellipse
          cx={headCx}
          cy={headCy}
          rx={headRx - 4}
          ry={headRy - 4}
          fill="none"
          stroke="#3a3f4b"
          strokeWidth="0.5"
        />

        {/* Throat — sideways V shape, opening toward the head */}
        <path
          d={`
            M ${throatLeftX} ${headCy - 70}
            Q ${throatLeftX + 22} ${headCy - 42}, ${shaftLeftX} ${
            headCy - shaftHeight / 2
          }
            L ${shaftLeftX} ${headCy + shaftHeight / 2}
            Q ${throatLeftX + 22} ${headCy + 42}, ${throatLeftX} ${headCy + 70}
          `}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Shaft — extends right, will visually pass under the sessions panel */}
        <rect
          x={shaftLeftX}
          y={headCy - shaftHeight / 2}
          width={shaftRightX - shaftLeftX}
          height={shaftHeight}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth="2.5"
        />

        {/* Grip */}
        <rect
          x={gripLeftX}
          y={headCy - gripHeight / 2}
          width={gripRightX - gripLeftX}
          height={gripHeight}
          fill={`url(#gripTape-${suffix})`}
          stroke="#f5f5f4"
          strokeWidth="2.5"
          rx="4"
        />

        {/* Grip cap on the right end */}
        <rect
          x={gripRightX - 4}
          y={headCy - gripHeight / 2 - 3}
          width="8"
          height={gripHeight + 6}
          fill="#1a1d24"
          stroke="#f5f5f4"
          strokeWidth="2.5"
          rx="2"
        />

        {/* Crosshair — shifted to match sweet spot position */}
        <g opacity="0.3">
          <line
            x1={headCx + 10}
            y1={headCy}
            x2={headCx + 26}
            y2={headCy}
            stroke="#d9ff3f"
            strokeWidth="0.5"
          />
          <line
            x1={headCx + 18}
            y1={headCy - 8}
            x2={headCx + 18}
            y2={headCy + 8}
            stroke="#d9ff3f"
            strokeWidth="0.5"
          />
        </g>

        {/* Hits */}
        <HitDots
          hits={hits}
          latestHitId={latestHitId}
          mapCoord={mapCoord}
          clipId={`stringBedClip-${suffix}`}
          baseRadius={9}
          latestRadius={12}
          pulseMaxR={70}
        />
      </svg>
    </div>
  );
}

/* ─────────────── Shared defs and hit dots ─────────────── */

function RacketDefs({ suffix }: { suffix: string }) {
  return (
    <>
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
        {suffix === "h" ? (
          <ellipse cx={310} cy={270} rx={276} ry={246} />
        ) : (
          <ellipse cx={200} cy={170} rx={136} ry={156} />
        )}
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
        <line x1="0" y1="0" x2="0" y2="8" stroke="#3a3f4b" strokeWidth="1" />
      </pattern>
    </>
  );
}

function HitDots({
  hits,
  latestHitId,
  mapCoord,
  clipId,
  baseRadius,
  latestRadius,
  pulseMaxR,
}: {
  hits: HitData[];
  latestHitId: string | null;
  mapCoord: (x: number, y: number) => { cx: number; cy: number };
  clipId: string;
  baseRadius: number;
  latestRadius: number;
  pulseMaxR: number;
}) {
  return (
    <g clipPath={`url(#${clipId})`}>
      {hits.map((hit, i) => {
        const { cx, cy } = mapCoord(hit.x, hit.y);
        const isLatest = hit.id === latestHitId;
        const age = hits.length - 1 - i;
        const opacity = Math.max(0.15, 1 - age * 0.04);

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
                transition={{ duration: 1.3, ease: "easeOut" }}
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
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </g>
        );
      })}
    </g>
  );
}
