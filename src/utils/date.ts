// Delte dato-hjelpere. Alle bruker enhetsløs "dag-differanse" (heltall) fra nå.
// Tekst og datoformat er språkavhengig via i18n (aktivt språk).
import i18n from "../lib/i18n";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const DATE_LOCALES: Record<string, string> = { no: "nb-NO", en: "en-GB" };

function currentLocale(): string {
  return DATE_LOCALES[i18n.language] ?? "nb-NO";
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY);
}

/** Dagnummer for en økt: startdag = 1. */
export function getDayNumber(startedAt: string): number {
  return daysSince(startedAt) + 1;
}

/** Kort dato i aktivt språk, f.eks. "5. jul." / "5 Jul". */
export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "short",
  });
}

/** Relativ etikett i dager: i dag / i går / N dager siden (oversatt). */
export function getRelativeDayLabel(dateStr: string): string {
  const diff = daysSince(dateStr);
  if (diff <= 0) return i18n.t("date.today");
  if (diff === 1) return i18n.t("date.yesterday");
  return i18n.t("date.daysAgo", { count: diff });
}

/** Som getRelativeDayLabel, men slår sammen til uker etter 7 dager. */
export function getRelativeDayOrWeekLabel(dateStr: string): string {
  const diff = daysSince(dateStr);
  if (diff <= 0) return i18n.t("date.today");
  if (diff === 1) return i18n.t("date.yesterday");
  if (diff < 7) return i18n.t("date.daysAgo", { count: diff });
  return i18n.t("date.weeksAgo", { count: Math.floor(diff / 7) });
}
