import { progressToFilled } from "../PuzzleProgressIcon";

describe("progressToFilled", () => {
  it("gir 0 for null/undefined", () => {
    expect(progressToFilled(null)).toBe(0);
    expect(progressToFilled(undefined as unknown as number)).toBe(0);
  });

  it("mapper prosent til antall fylte brikker (0–4)", () => {
    expect(progressToFilled(0)).toBe(0);
    expect(progressToFilled(12)).toBe(0);
    expect(progressToFilled(25)).toBe(1);
    expect(progressToFilled(50)).toBe(2);
    expect(progressToFilled(75)).toBe(3);
    expect(progressToFilled(100)).toBe(4);
  });

  it("bruker terskler ved grensene", () => {
    expect(progressToFilled(13)).toBe(1);
    expect(progressToFilled(37)).toBe(1);
    expect(progressToFilled(38)).toBe(2);
    expect(progressToFilled(88)).toBe(4);
  });
});
