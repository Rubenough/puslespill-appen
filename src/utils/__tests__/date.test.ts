import i18n from "../../lib/i18n";
import {
  getDayNumber,
  getRelativeDayLabel,
  getRelativeDayOrWeekLabel,
  formatShortDate,
} from "../date";

// Fast "nå" for deterministiske relative etiketter.
const NOW = new Date("2026-07-04T12:00:00Z").getTime();

function daysAgo(n: number): string {
  return new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await i18n.changeLanguage("no");
});

describe("getDayNumber", () => {
  it("regner startdagen som dag 1", () => {
    expect(getDayNumber(daysAgo(0))).toBe(1);
  });

  it("øker med antall hele dager siden start", () => {
    expect(getDayNumber(daysAgo(1))).toBe(2);
    expect(getDayNumber(daysAgo(9))).toBe(10);
  });
});

describe("getRelativeDayLabel (no)", () => {
  it("bruker i dag / i går for de siste to dagene", () => {
    expect(getRelativeDayLabel(daysAgo(0))).toBe("i dag");
    expect(getRelativeDayLabel(daysAgo(1))).toBe("i går");
  });

  it("teller dager for eldre datoer", () => {
    expect(getRelativeDayLabel(daysAgo(3))).toBe("3 dager siden");
    expect(getRelativeDayLabel(daysAgo(30))).toBe("30 dager siden");
  });
});

describe("getRelativeDayOrWeekLabel (no)", () => {
  it("slår sammen til uker fra sju dager, med entall/flertall", () => {
    expect(getRelativeDayOrWeekLabel(daysAgo(6))).toBe("6 dager siden");
    expect(getRelativeDayOrWeekLabel(daysAgo(7))).toBe("1 uke siden");
    expect(getRelativeDayOrWeekLabel(daysAgo(13))).toBe("1 uke siden");
    expect(getRelativeDayOrWeekLabel(daysAgo(14))).toBe("2 uker siden");
  });
});

describe("relative labels (en)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("oversetter dager og uker til engelsk", () => {
    expect(getRelativeDayLabel(daysAgo(0))).toBe("today");
    expect(getRelativeDayLabel(daysAgo(1))).toBe("yesterday");
    expect(getRelativeDayLabel(daysAgo(3))).toBe("3 days ago");
    expect(getRelativeDayOrWeekLabel(daysAgo(7))).toBe("1 week ago");
    expect(getRelativeDayOrWeekLabel(daysAgo(21))).toBe("3 weeks ago");
  });
});

describe("formatShortDate", () => {
  it("returnerer en ikke-tom streng med dagtall", () => {
    const label = formatShortDate("2026-07-05T00:00:00Z");
    expect(typeof label).toBe("string");
    expect(label).toMatch(/\d/);
  });
});
