import i18n from "../../lib/i18n";
import { DUE_OPTIONS, dueAtFromKey, daysUntilDue, dueDateLabel } from "../loans";

// Fast "nå" midt på dagen for deterministiske frist-etiketter.
const NOW = new Date("2026-07-04T12:00:00");

function dateStr(daysFromNow: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

afterEach(async () => {
  await i18n.changeLanguage("no");
});

describe("dueAtFromKey", () => {
  it("returnerer null for 'none' og ukjente nøkler", () => {
    expect(dueAtFromKey("none")).toBeNull();
    expect(dueAtFromKey("finnes-ikke")).toBeNull();
  });

  it("returnerer en YYYY-MM-DD-streng for hurtigvalgene", () => {
    for (const opt of DUE_OPTIONS) {
      if (opt.days == null) continue;
      expect(dueAtFromKey(opt.key)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("daysUntilDue", () => {
  it("regner på datonivå: i dag = 0, i morgen = 1, i går = -1", () => {
    expect(daysUntilDue(dateStr(0), NOW)).toBe(0);
    expect(daysUntilDue(dateStr(1), NOW)).toBe(1);
    expect(daysUntilDue(dateStr(-1), NOW)).toBe(-1);
    expect(daysUntilDue(dateStr(14), NOW)).toBe(14);
  });
});

describe("dueDateLabel (no)", () => {
  it("bruker frist-innramming for kommende frister", () => {
    expect(dueDateLabel(dateStr(0), NOW)).toEqual({
      label: "forfaller i dag",
      overdue: false,
    });
    expect(dueDateLabel(dateStr(1), NOW)).toEqual({
      label: "forfaller i morgen",
      overdue: false,
    });
    expect(dueDateLabel(dateStr(3), NOW)).toEqual({
      label: "forfaller om 3 dager",
      overdue: false,
    });
  });

  it("markerer passerte frister som overdue med antall dager", () => {
    expect(dueDateLabel(dateStr(-1), NOW)).toEqual({
      label: "1 dag over fristen",
      overdue: true,
    });
    expect(dueDateLabel(dateStr(-2), NOW)).toEqual({
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
    expect(dueDateLabel(dateStr(0), NOW).label).toBe("due today");
    expect(dueDateLabel(dateStr(1), NOW).label).toBe("due tomorrow");
    expect(dueDateLabel(dateStr(5), NOW).label).toBe("due in 5 days");
    expect(dueDateLabel(dateStr(-3), NOW).label).toBe("3 days overdue");
  });
});
