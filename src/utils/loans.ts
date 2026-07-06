// Delte hjelpere for lånefrist (due_at). Brukes av utlånsmodalen
// (CollectionDetailScreen) og godkjenn-flyten (RequestsScreen).

// Hurtigvalg for frist. `labelKey` peker på i18n-nøkler i collectionDetail-navnerommet.
export const DUE_OPTIONS = [
  { key: "none", labelKey: "collectionDetail.dueNone", days: null },
  { key: "1w", labelKey: "collectionDetail.due1Week", days: 7 },
  { key: "2w", labelKey: "collectionDetail.due2Weeks", days: 14 },
  { key: "1m", labelKey: "collectionDetail.due1Month", days: 30 },
] as const;

// Gjør et hurtigvalg om til en `date`-streng (YYYY-MM-DD) for loans.due_at, eller null.
export function dueAtFromKey(key: string): string | null {
  const opt = DUE_OPTIONS.find((o) => o.key === key);
  if (!opt || opt.days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + opt.days);
  return d.toISOString().slice(0, 10);
}
