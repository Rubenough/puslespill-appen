import i18n from "../../lib/i18n";
import {
  DUE_OPTIONS,
  dueAtFromKey,
  isOverdue,
  toLocalDateString,
  daysUntilDue,
  dueDateLabel,
} from "../loans";

// Frist-logikken bruker LOKALE kalenderdager. Testene injiserer `now` som lokale
// Date-objekter (år, måned, dag, time) slik at de er deterministiske uavhengig av
// maskinens tidssone.
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min);

describe("toLocalDateString", () => {
  it("formaterer lokale komponenter som YYYY-MM-DD med nullpadding", () => {
    expect(toLocalDateString(at(2026, 7, 5))).toBe("2026-07-05");
    expect(toLocalDateString(at(2026, 11, 30))).toBe("2026-11-30");
    expect(toLocalDateString(at(2026, 1, 1))).toBe("2026-01-01");
  });

  it("bruker den lokale datoen også sent på kvelden (UTC-datoen kan avvike)", () => {
    // 23:59 lokal tid: toISOString() ville gitt neste/samme UTC-dag avhengig av
    // tidssone — lokal formatering skal alltid gi den lokale kalenderdagen.
    expect(toLocalDateString(at(2026, 7, 10, 23, 59))).toBe("2026-07-10");
    expect(toLocalDateString(at(2026, 7, 10, 0, 1))).toBe("2026-07-10");
  });
});

describe("dueAtFromKey", () => {
  const NOW = at(2026, 7, 10);

  it('returnerer null for "none" og ukjente nøkler', () => {
    expect(dueAtFromKey("none", NOW)).toBeNull();
    expect(dueAtFromKey("bogus", NOW)).toBeNull();
    expect(dueAtFromKey("", NOW)).toBeNull();
  });

  it("legger til riktig antall dager for hvert hurtigvalg", () => {
    expect(dueAtFromKey("1w", NOW)).toBe("2026-07-17");
    expect(dueAtFromKey("2w", NOW)).toBe("2026-07-24");
    expect(dueAtFromKey("1m", NOW)).toBe("2026-08-09"); // 30 dager, ikke kalendermåned
  });

  it("ruller over måneds- og årsskifter", () => {
    expect(dueAtFromKey("1w", at(2026, 1, 28))).toBe("2026-02-04");
    expect(dueAtFromKey("2w", at(2026, 12, 25))).toBe("2027-01-08");
    expect(dueAtFromKey("1m", at(2026, 2, 15))).toBe("2026-03-17"); // ikke-skuddår: feb = 28 dager
  });

  it("bruker lokal kalenderdag også rett før midnatt (tidssone-kant)", () => {
    // Med gammel toISOString()-implementasjon kunne 23:30 lokal tid gi en
    // frist én dag feil for brukere vest for UTC.
    expect(dueAtFromKey("1w", at(2026, 7, 10, 23, 30))).toBe("2026-07-17");
    expect(dueAtFromKey("1w", at(2026, 7, 10, 0, 15))).toBe("2026-07-17");
  });

  it("muterer ikke `now`", () => {
    const now = at(2026, 7, 10);
    const before = now.getTime();
    dueAtFromKey("1m", now);
    expect(now.getTime()).toBe(before);
  });

  it("gir en gyldig YYYY-MM-DD-streng for alle definerte hurtigvalg med frist", () => {
    for (const opt of DUE_OPTIONS) {
      const result = dueAtFromKey(opt.key, NOW);
      if (opt.days == null) {
        expect(result).toBeNull();
      } else {
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe("isOverdue", () => {
  const NOW = at(2026, 7, 10);

  it("er false uten frist", () => {
    expect(isOverdue(null, NOW)).toBe(false);
  });

  it("regner ikke fristdagen selv som forfalt (skal leveres i dag)", () => {
    expect(isOverdue("2026-07-10", NOW)).toBe(false);
  });

  it("er false for frister frem i tid (i morgen og senere)", () => {
    expect(isOverdue("2026-07-11", NOW)).toBe(false);
    expect(isOverdue("2026-08-01", NOW)).toBe(false);
    expect(isOverdue("2027-01-01", NOW)).toBe(false);
  });

  it("er true for passerte frister (i går og tidligere)", () => {
    expect(isOverdue("2026-07-09", NOW)).toBe(true);
    expect(isOverdue("2026-06-30", NOW)).toBe(true);
    expect(isOverdue("2025-12-31", NOW)).toBe(true);
  });

  it("sammenligner riktig over måneds- og årsskifter (leksikografisk ISO)", () => {
    expect(isOverdue("2026-06-30", at(2026, 7, 1))).toBe(true);
    expect(isOverdue("2025-12-31", at(2026, 1, 1))).toBe(true);
    expect(isOverdue("2026-01-01", at(2025, 12, 31))).toBe(false);
  });

  it("bruker lokal dato rundt midnatt (tidssone-kant)", () => {
    // 00:05 lokal tid 10. juli: frist 9. juli er forfalt, frist 10. juli ikke —
    // uansett hva UTC-datoen måtte være.
    const justAfterMidnight = at(2026, 7, 10, 0, 5);
    expect(isOverdue("2026-07-09", justAfterMidnight)).toBe(true);
    expect(isOverdue("2026-07-10", justAfterMidnight)).toBe(false);

    const justBeforeMidnight = at(2026, 7, 10, 23, 55);
    expect(isOverdue("2026-07-10", justBeforeMidnight)).toBe(false);
  });

  it("teller riktig antall forfalte lån i en liste", () => {
    const dueDates = ["2026-07-09", "2026-07-10", "2026-07-11", null, "2026-05-01"];
    const overdueCount = dueDates.filter((d) => isOverdue(d, NOW)).length;
    expect(overdueCount).toBe(2);
  });
});

// ─── Frist-etiketter (deadline-innramming i lånehuben) ────────────────────────

// Fast "nå" midt på dagen for deterministiske frist-etiketter.
const LABEL_NOW = at(2026, 7, 4);

function dateStr(daysFromNow: number): string {
  const d = new Date(LABEL_NOW);
  d.setDate(d.getDate() + daysFromNow);
  return toLocalDateString(d);
}

afterEach(async () => {
  await i18n.changeLanguage("no");
});

describe("daysUntilDue", () => {
  it("regner på datonivå: i dag = 0, i morgen = 1, i går = -1", () => {
    expect(daysUntilDue(dateStr(0), LABEL_NOW)).toBe(0);
    expect(daysUntilDue(dateStr(1), LABEL_NOW)).toBe(1);
    expect(daysUntilDue(dateStr(-1), LABEL_NOW)).toBe(-1);
    expect(daysUntilDue(dateStr(14), LABEL_NOW)).toBe(14);
  });
});

describe("dueDateLabel (no)", () => {
  it("bruker frist-innramming for kommende frister", () => {
    expect(dueDateLabel(dateStr(0), LABEL_NOW)).toEqual({
      label: "forfaller i dag",
      overdue: false,
    });
    expect(dueDateLabel(dateStr(1), LABEL_NOW)).toEqual({
      label: "forfaller i morgen",
      overdue: false,
    });
    expect(dueDateLabel(dateStr(3), LABEL_NOW)).toEqual({
      label: "forfaller om 3 dager",
      overdue: false,
    });
  });

  it("markerer passerte frister som overdue med antall dager", () => {
    expect(dueDateLabel(dateStr(-1), LABEL_NOW)).toEqual({
      label: "1 dag over fristen",
      overdue: true,
    });
    expect(dueDateLabel(dateStr(-2), LABEL_NOW)).toEqual({
      label: "2 dager over fristen",
      overdue: true,
    });
  });
});

describe("dueDateLabel (en)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("oversetter frist-etikettene til engelsk", () => {
    expect(dueDateLabel(dateStr(0), LABEL_NOW).label).toBe("due today");
    expect(dueDateLabel(dateStr(1), LABEL_NOW).label).toBe("due tomorrow");
    expect(dueDateLabel(dateStr(5), LABEL_NOW).label).toBe("due in 5 days");
    expect(dueDateLabel(dateStr(-3), LABEL_NOW).label).toBe("3 days overdue");
  });
});
