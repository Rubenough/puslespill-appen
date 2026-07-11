// Delte hjelpere for lånefrist (due_at). Brukes av utlånsmodalen
// (CollectionDetailScreen) og lånehuben (LoansHubScreen).
import i18n from "../lib/i18n";

// Hurtigvalg for frist. `labelKey` peker på i18n-nøkler i collectionDetail-navnerommet.
export const DUE_OPTIONS = [
  { key: "none", labelKey: "collectionDetail.dueNone", days: null },
  { key: "1w", labelKey: "collectionDetail.due1Week", days: 7 },
  { key: "2w", labelKey: "collectionDetail.due2Weeks", days: 14 },
  { key: "1m", labelKey: "collectionDetail.due1Month", days: 30 },
] as const;

// Lokal kalenderdato som YYYY-MM-DD. Bevisst IKKE toISOString(): den gir
// UTC-datoen, som rundt midnatt kan avvike med én dag fra brukerens lokale dato
// (f.eks. 23:30 i UTC-5 → neste dag i UTC). Frister er lokale kalenderdager.
export function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Gjør et hurtigvalg om til en `date`-streng (YYYY-MM-DD) for loans.due_at, eller null.
// `now` kan injiseres i test; standard er nå.
export function dueAtFromKey(key: string, now: Date = new Date()): string | null {
  const opt = DUE_OPTIONS.find((o) => o.key === key);
  if (!opt || opt.days == null) return null;
  const d = new Date(now);
  d.setDate(d.getDate() + opt.days);
  return toLocalDateString(d);
}

// En date-verdi (YYYY-MM-DD) er forfalt hvis den er før dagens LOKALE dato.
// Fristdagen selv regnes ikke som forfalt. Strengsammenligning er trygg for
// ISO-datoer (leksikografisk = kronologisk).
export function isOverdue(due: string | null, now: Date = new Date()): boolean {
  if (!due) return false;
  return due < toLocalDateString(now);
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Hele dager til fristen (due = YYYY-MM-DD), på datonivå. Negativt = over fristen. */
export function daysUntilDue(due: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = due.split("-").map(Number);
  const dueDate = new Date(y, m - 1, d);
  return Math.round((dueDate.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * Frist-etikett med deadline-innramming (aktivt språk):
 * "forfaller om 3 dager" / "forfaller i dag" / "2 dager over fristen".
 */
export function dueDateLabel(
  due: string,
  now: Date = new Date(),
): { label: string; overdue: boolean } {
  const days = daysUntilDue(due, now);
  if (days < 0) {
    return { label: i18n.t("loans.overdueByDays", { count: -days }), overdue: true };
  }
  if (days === 0) return { label: i18n.t("loans.dueToday"), overdue: false };
  if (days === 1) return { label: i18n.t("loans.dueTomorrow"), overdue: false };
  return { label: i18n.t("loans.dueInDays", { count: days }), overdue: false };
}
