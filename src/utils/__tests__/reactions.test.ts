import { applyToggle, type Reaction } from "../reactions";

describe("applyToggle", () => {
  it("adds a new reaction when none exists for the emoji", () => {
    const result = applyToggle([], "👍", false);
    expect(result).toEqual([{ emoji: "👍", count: 1, mine: true }]);
  });

  it("joins an existing reaction (increments count, marks mine)", () => {
    const list: Reaction[] = [{ emoji: "👍", count: 2, mine: false }];
    expect(applyToggle(list, "👍", false)).toEqual([
      { emoji: "👍", count: 3, mine: true },
    ]);
  });

  it("removes my reaction but keeps the row when others remain", () => {
    const list: Reaction[] = [{ emoji: "❤️", count: 2, mine: true }];
    expect(applyToggle(list, "❤️", true)).toEqual([
      { emoji: "❤️", count: 1, mine: false },
    ]);
  });

  it("drops the row when my reaction was the last one", () => {
    const list: Reaction[] = [{ emoji: "🎉", count: 1, mine: true }];
    expect(applyToggle(list, "🎉", true)).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const list: Reaction[] = [{ emoji: "🧩", count: 1, mine: false }];
    const snapshot = JSON.parse(JSON.stringify(list));
    applyToggle(list, "🧩", false);
    expect(list).toEqual(snapshot);
  });

  it("leaves other emojis untouched", () => {
    const list: Reaction[] = [
      { emoji: "👍", count: 1, mine: false },
      { emoji: "❤️", count: 2, mine: true },
    ];
    const result = applyToggle(list, "👍", false);
    expect(result).toContainEqual({ emoji: "❤️", count: 2, mine: true });
    expect(result).toContainEqual({ emoji: "👍", count: 2, mine: true });
  });
});
