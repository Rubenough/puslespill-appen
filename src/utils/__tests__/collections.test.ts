import {
  ITEM_ICONS,
  ITEM_LABELS,
  DIFFICULTY_OPTIONS,
  type ItemType,
} from "../collections";

const TYPES: ItemType[] = ["puslespill", "brettspill"];

describe("collections-konstanter", () => {
  it("har ikon og etikett for hver gjenstandstype", () => {
    for (const type of TYPES) {
      expect(ITEM_ICONS[type]).toBeTruthy();
      expect(ITEM_LABELS[type]).toBeTruthy();
    }
  });

  it("bruker forventede norske etiketter", () => {
    expect(ITEM_LABELS.puslespill).toBe("Puslespill");
    expect(ITEM_LABELS.brettspill).toBe("Brettspill");
  });

  it("tilbyr de tre vanskelighetsgradene i rekkefølge", () => {
    expect(DIFFICULTY_OPTIONS).toEqual(["Lett", "Middels", "Vanskelig"]);
  });
});
