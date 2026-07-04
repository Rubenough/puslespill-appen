// Delte dato-hjelpere. Alle bruker enhetsløs "dag-differanse" (heltall) fra nå.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY);
}

/** Dagnummer for en økt: startdag = 1. */
export function getDayNumber(startedAt: string): number {
  return daysSince(startedAt) + 1;
}

/** Kort norsk dato, f.eks. "5. jul". */
export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

/** Relativ etikett i dager: "i dag" / "i går" / "N dager siden". */
export function getRelativeDayLabel(dateStr: string): string {
  const diff = daysSince(dateStr);
  if (diff <= 0) return "i dag";
  if (diff === 1) return "i går";
  return `${diff} dager siden`;
}

/** Som getRelativeDayLabel, men slår sammen til uker etter 7 dager. */
export function getRelativeDayOrWeekLabel(dateStr: string): string {
  const diff = daysSince(dateStr);
  if (diff <= 0) return "i dag";
  if (diff === 1) return "i går";
  if (diff < 7) return `${diff} dager siden`;
  if (diff < 14) return "1 uke siden";
  return `${Math.floor(diff / 7)} uker siden`;
}
