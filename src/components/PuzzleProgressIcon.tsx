import React from "react";
import Svg, { Path } from "react-native-svg";

type Props = {
  /** 0–4: antall fylte brikker */
  filled: number;
  /** Ikon-størrelse i px (default 64) */
  size?: number;
  /** Farge for fylte brikker */
  filledColor?: string;
  /** Farge for tomme brikker */
  emptyColor?: string;
};

/**
 * 4 puslespillbrikker i 2×2 rutenett med tapper og hull.
 *
 * ViewBox 100×100. Brikker: UL (2,2)→(47,47), UR (53,2)→(98,47),
 * LL (2,53)→(47,98), LR (53,53)→(98,98). Tapper 6px dype, 12px brede.
 *
 * Fylle-rekkefølge: nedre-venstre → nedre-høyre → øvre-venstre → øvre-høyre.
 */
export default function PuzzleProgressIcon({
  filled,
  size = 64,
  filledColor = "#1D9E75",
  emptyColor = "#A8A29E",
}: Props) {
  const f = Math.max(0, Math.min(4, Math.round(filled)));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Øvre venstre — tapp høyre, tapp ned */}
      <Path
        d={PATHS.upperLeft}
        fill={f >= 3 ? filledColor : emptyColor}
        opacity={f >= 3 ? 1 : 0.25}
      />
      {/* Øvre høyre — hull venstre, tapp ned */}
      <Path
        d={PATHS.upperRight}
        fill={f >= 4 ? filledColor : emptyColor}
        opacity={f >= 4 ? 1 : 0.25}
      />
      {/* Nedre venstre — hull topp, tapp høyre */}
      <Path
        d={PATHS.lowerLeft}
        fill={f >= 1 ? filledColor : emptyColor}
        opacity={f >= 1 ? 1 : 0.25}
      />
      {/* Nedre høyre — hull venstre, hull topp */}
      <Path
        d={PATHS.lowerRight}
        fill={f >= 2 ? filledColor : emptyColor}
        opacity={f >= 2 ? 1 : 0.25}
      />
    </Svg>
  );
}

// Tapp-/hull-spesifikasjon:
// - Tapper stikker 6px ut fra kanten (x=47→53 eller y=47→53)
// - 12px brede (±6 fra senter)
// - Kubisk bezier gir avrundet pusle-form
// - Hull er speilvendt: kurven bøyer innover i stedet for utover
const PATHS = {
  // UL: tabs on right (y=25) and bottom (x=25)
  upperLeft: `
    M 2 2 L 47 2
    L 47 19 C 47 17, 53 17, 53 25 C 53 33, 47 33, 47 31 L 47 47
    L 31 47 C 33 47, 33 53, 25 53 C 17 53, 17 47, 19 47 L 2 47
    Z
  `,
  // UR: socket on left (y=25), tab on bottom (x=75)
  upperRight: `
    M 53 2 L 98 2 L 98 47
    L 81 47 C 83 47, 83 53, 75 53 C 67 53, 67 47, 69 47 L 53 47
    L 53 31 C 53 33, 47 33, 47 25 C 47 17, 53 17, 53 19
    Z
  `,
  // LL: socket on top (x=25), tab on right (y=75)
  lowerLeft: `
    M 2 53
    L 19 53 C 17 53, 17 47, 25 47 C 33 47, 33 53, 31 53 L 47 53
    L 47 69 C 47 67, 53 67, 53 75 C 53 83, 47 83, 47 81 L 47 98
    L 2 98
    Z
  `,
  // LR: socket on left (y=75), socket on top (x=75)
  lowerRight: `
    M 53 53
    L 69 53 C 67 53, 67 47, 75 47 C 83 47, 83 53, 81 53 L 98 53
    L 98 98 L 53 98
    L 53 81 C 53 83, 47 83, 47 75 C 47 67, 53 67, 53 69
    Z
  `,
};

/** Mapper progress_pct (0–100) til antall fylte brikker (0–4) */
export function progressToFilled(pct: number | null): number {
  if (pct === null || pct === undefined) return 0;
  if (pct <= 12) return 0;
  if (pct <= 37) return 1;
  if (pct <= 62) return 2;
  if (pct <= 87) return 3;
  return 4;
}
