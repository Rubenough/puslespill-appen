import {
  getDayNumber,
  formatShortDate,
  getRelativeDayLabel,
  getRelativeDayOrWeekLabel,
} from "../date";

// Fast "nå" for deterministiske relative etiketter.
const NOW = new Date("2026-07-04T12:00:00Z").getTime();

function daysAgo(n: number): string {
  return new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
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

describe("getRelativeDayLabel", () => {
  it("bruker i dag / i går for de siste to dagene", () => {
    expect(getRelativeDayLabel(daysAgo(0))).toBe("i dag");
    expect(getRelativeDayLabel(daysAgo(1))).toBe("i går");
  });

  it("teller dager for eldre datoer", () => {
    expect(getRelativeDayLabel(daysAgo(3))).toBe("3 dager siden");
    expect(getRelativeDayLabel(daysAgo(30))).toBe("30 dager siden");
  });
});

describe("getRelativeDayOrWeekLabel", () => {
  it("oppfører seg som dag-etiketten under en uke", () => {
    expect(getRelativeDayOrWeekLabel(daysAgo(0))).toBe("i dag");
    expect(getRelativeDayOrWeekLabel(daysAgo(1))).toBe("i går");
    expect(getRelativeDayOrWeekLabel(daysAgo(6))).toBe("6 dager siden");
  });

  it("slår sammen til uker fra sju dager", () => {
    expect(getRelativeDayOrWeekLabel(daysAgo(7))).toBe("1 uke siden");
    expect(getRelativeDayOrWeekLabel(daysAgo(13))).toBe("1 uke siden");
    expect(getRelativeDayOrWeekLabel(daysAgo(14))).toBe("2 uker siden");
    expect(getRelativeDayOrWeekLabel(daysAgo(21))).toBe("3 uker siden");
  });
});

describe("formatShortDate", () => {
  it("returnerer en ikke-tom streng med dagtall", () => {
    const label = formatShortDate("2026-07-05T00:00:00Z");
    expect(typeof label).toBe("string");
    expect(label).toMatch(/\d/);
  });
});
