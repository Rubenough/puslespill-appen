import i18n from "../../lib/i18n";
import {
  buildFeedItems,
  type BuildFeedItemsInput,
  type SessionRow,
  type ItemRow,
  type LoanRow,
  type BorrowRow,
  type ProfileRow,
} from "../feed";

// ─── Testdata-fabrikker ───────────────────────────────────────────────────────

const ME = "user-me";
const FRIEND = "user-friend";

const profile = (id: string, name: string | null, avatar: string | null = null) =>
  ({ id, full_name: name, avatar_url: avatar }) satisfies ProfileRow;

const sessionRow = (over: Partial<SessionRow> = {}): SessionRow => ({
  id: "s1",
  started_at: "2026-07-08T10:00:00Z",
  completed_at: null,
  guest_names: null,
  created_by: ME,
  image_url: null,
  items: { title: "Kinkaku-ji", type: "puslespill" },
  ...over,
});

const itemRow = (over: Partial<ItemRow> = {}): ItemRow => ({
  id: "i1",
  title: "Wingspan",
  type: "brettspill",
  created_at: "2026-07-07T09:00:00Z",
  owner_id: ME,
  cover_url: null,
  ...over,
});

const loanRow = (over: Partial<LoanRow> = {}): LoanRow => ({
  id: "l1",
  borrower_name: "Kari",
  loaned_at: "2026-07-06T08:00:00Z",
  items: { title: "Azul", type: "brettspill" },
  ...over,
});

const borrowRow = (over: Partial<BorrowRow> = {}): BorrowRow => ({
  id: "b1",
  owner_id: FRIEND,
  responded_at: "2026-07-05T07:00:00Z",
  items: { title: "Ravensburger 1000", type: "puslespill" },
  ...over,
});

const baseInput = (over: Partial<BuildFeedItemsInput> = {}): BuildFeedItemsInput => ({
  userId: ME,
  sessionRows: [],
  itemRows: [],
  loanRows: [],
  borrowRows: [],
  profilesById: new Map([
    [ME, profile(ME, "Ruben", "https://a/me.jpg")],
    [FRIEND, profile(FRIEND, "Ole", "https://a/ole.jpg")],
  ]),
  imagePathBySession: new Map(),
  signedByPath: new Map(),
  ...over,
});

beforeAll(async () => {
  await i18n.changeLanguage("no");
});

// ─── Hendelsestyper ───────────────────────────────────────────────────────────

describe("buildFeedItems — hendelsestyper", () => {
  it("mapper en aktiv økt til 'started' med gjester og tidsstempel fra started_at", () => {
    const result = buildFeedItems(
      baseInput({ sessionRows: [sessionRow({ guest_names: ["Mor", "Far"] })] }),
    );
    expect(result).toEqual([
      {
        id: "started-s1",
        type: "started",
        timestamp: "2026-07-08T10:00:00Z",
        userName: "Ruben",
        avatarUrl: "https://a/me.jpg",
        itemType: "puslespill",
        itemTitle: "Kinkaku-ji",
        withUsers: ["Mor", "Far"],
        sessionId: "s1",
        imageUrl: null,
      },
    ]);
  });

  it("mapper en fullført økt til 'completed' med tidsstempel fra completed_at", () => {
    const result = buildFeedItems(
      baseInput({
        sessionRows: [sessionRow({ completed_at: "2026-07-09T20:00:00Z" })],
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "completed-s1",
      type: "completed",
      timestamp: "2026-07-09T20:00:00Z",
      sessionId: "s1",
    });
    // 'completed' har ikke withUsers
    expect(result[0]).not.toHaveProperty("withUsers");
  });

  it("bruker tom gjesteliste når guest_names er null", () => {
    const result = buildFeedItems(baseInput({ sessionRows: [sessionRow()] }));
    expect(result[0]).toMatchObject({ type: "started", withUsers: [] });
  });

  it("mapper en gjenstand til 'added' med isOwn for egne og venners rader", () => {
    const result = buildFeedItems(
      baseInput({
        itemRows: [
          itemRow(),
          itemRow({ id: "i2", owner_id: FRIEND, created_at: "2026-07-07T08:00:00Z" }),
        ],
      }),
    );
    expect(result[0]).toMatchObject({
      id: "added-i1",
      type: "added",
      userName: "Ruben",
      ownerId: ME,
      isOwn: true,
      itemType: "brettspill",
      itemTitle: "Wingspan",
    });
    expect(result[1]).toMatchObject({
      id: "added-i2",
      userName: "Ole",
      ownerId: FRIEND,
      isOwn: false,
    });
  });

  it("mapper et utlån til 'loaned' med låntakernavn og brukeren selv som avsender", () => {
    const result = buildFeedItems(baseInput({ loanRows: [loanRow()] }));
    expect(result).toEqual([
      {
        id: "loaned-l1",
        type: "loaned",
        timestamp: "2026-07-06T08:00:00Z",
        userName: "Ruben",
        avatarUrl: "https://a/me.jpg",
        itemType: "brettspill",
        itemTitle: "Azul",
        loanedTo: "Kari",
      },
    ]);
  });

  it("utelater loanedTo når borrower_name mangler", () => {
    const result = buildFeedItems(
      baseInput({ loanRows: [loanRow({ borrower_name: null })] }),
    );
    expect(result[0]).toMatchObject({ type: "loaned", loanedTo: undefined });
  });

  it("mapper en godkjent forespørsel til 'borrowed' med eierens navn", () => {
    const result = buildFeedItems(baseInput({ borrowRows: [borrowRow()] }));
    expect(result).toEqual([
      {
        id: "borrowed-b1",
        type: "borrowed",
        timestamp: "2026-07-05T07:00:00Z",
        userName: "Ruben",
        avatarUrl: "https://a/me.jpg",
        itemType: "puslespill",
        itemTitle: "Ravensburger 1000",
        fromName: "Ole",
      },
    ]);
  });

  it("hopper over forespørsler uten responded_at", () => {
    const result = buildFeedItems(
      baseInput({ borrowRows: [borrowRow({ responded_at: null })] }),
    );
    expect(result).toEqual([]);
  });
});

// ─── Sortering ────────────────────────────────────────────────────────────────

describe("buildFeedItems — sortering", () => {
  it("sorterer alle fire hendelsestyper samlet, nyeste først", () => {
    const result = buildFeedItems(
      baseInput({
        sessionRows: [
          sessionRow({ id: "s-old", started_at: "2026-07-01T10:00:00Z" }),
          sessionRow({
            id: "s-done",
            started_at: "2026-07-02T10:00:00Z",
            completed_at: "2026-07-09T10:00:00Z",
          }),
        ],
        itemRows: [itemRow({ created_at: "2026-07-08T10:00:00Z" })],
        loanRows: [loanRow({ loaned_at: "2026-07-05T10:00:00Z" })],
        borrowRows: [borrowRow({ responded_at: "2026-07-03T10:00:00Z" })],
      }),
    );
    expect(result.map((f) => f.id)).toEqual([
      "completed-s-done", // 09.
      "added-i1", // 08.
      "loaned-l1", // 05.
      "borrowed-b1", // 03.
      "started-s-old", // 01.
    ]);
  });

  it("bruker completed_at (ikke started_at) som sorteringsnøkkel for fullførte økter", () => {
    const result = buildFeedItems(
      baseInput({
        sessionRows: [
          sessionRow({ id: "s-active", started_at: "2026-07-06T10:00:00Z" }),
          sessionRow({
            id: "s-done",
            started_at: "2026-07-01T10:00:00Z", // startet før...
            completed_at: "2026-07-08T10:00:00Z", // ...men fullført etter
          }),
        ],
      }),
    );
    expect(result.map((f) => f.id)).toEqual(["completed-s-done", "started-s-active"]);
  });
});

// ─── Manglende data / fallbacks ───────────────────────────────────────────────

describe("buildFeedItems — manglende profiler og joins", () => {
  it("faller tilbake til 'Ukjent bruker' når profilen mangler", () => {
    const result = buildFeedItems(
      baseInput({
        sessionRows: [sessionRow({ created_by: "user-unknown" })],
        itemRows: [itemRow({ owner_id: "user-unknown" })],
      }),
    );
    for (const item of result) {
      expect(item.userName).toBe("Ukjent bruker");
      expect(item.avatarUrl).toBeNull();
    }
  });

  it("faller tilbake til 'Ukjent bruker' som avsender og eier når egen/eiers profil mangler", () => {
    const result = buildFeedItems(
      baseInput({
        profilesById: new Map(), // ingen profiler i det hele tatt
        loanRows: [loanRow()],
        borrowRows: [borrowRow()],
      }),
    );
    const loaned = result.find((f) => f.type === "loaned");
    const borrowed = result.find((f) => f.type === "borrowed");
    expect(loaned?.userName).toBe("Ukjent bruker");
    expect(borrowed).toMatchObject({
      userName: "Ukjent bruker",
      fromName: "Ukjent bruker",
    });
  });

  it("tåler manglende item-join: tom tittel og trygg fallback-type", () => {
    const result = buildFeedItems(
      baseInput({
        sessionRows: [sessionRow({ items: null })],
        loanRows: [loanRow({ items: null })],
        borrowRows: [borrowRow({ items: null })],
      }),
    );
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.itemTitle).toBe("");
      expect(item.itemType).toBe("puslespill");
    }
  });

  it("oversetter fallback-navnet etter aktivt språk", async () => {
    await i18n.changeLanguage("en");
    try {
      const result = buildFeedItems(
        baseInput({ sessionRows: [sessionRow({ created_by: "user-unknown" })] }),
      );
      expect(result[0].userName).toBe("Unknown user");
    } finally {
      await i18n.changeLanguage("no");
    }
  });
});

// ─── Bilde-oppslag ────────────────────────────────────────────────────────────

describe("buildFeedItems — signerte bilder", () => {
  it("slår opp øktens bildesti og bytter til signert URL", () => {
    const result = buildFeedItems(
      baseInput({
        sessionRows: [sessionRow()],
        imagePathBySession: new Map([["s1", "me/s1/1.jpg"]]),
        signedByPath: new Map([["me/s1/1.jpg", "https://signed/s1.jpg?token=x"]]),
      }),
    );
    expect(result[0]).toMatchObject({ imageUrl: "https://signed/s1.jpg?token=x" });
  });

  it("gir null når stien finnes men signeringen mangler (aldri rå lagringssti ut)", () => {
    const result = buildFeedItems(
      baseInput({
        sessionRows: [sessionRow()],
        imagePathBySession: new Map([["s1", "me/s1/1.jpg"]]),
        signedByPath: new Map(), // signering feilet/mangler
      }),
    );
    expect(result[0]).toMatchObject({ imageUrl: null });
  });

  it("signerer gjenstands-omslag for 'added' og gir null uten omslag", () => {
    const result = buildFeedItems(
      baseInput({
        itemRows: [
          itemRow({ id: "i-cover", cover_url: "me/covers/i1.jpg" }),
          itemRow({ id: "i-plain", created_at: "2026-07-06T09:00:00Z" }),
        ],
        signedByPath: new Map([["me/covers/i1.jpg", "https://signed/cover.jpg"]]),
      }),
    );
    expect(result[0]).toMatchObject({
      id: "added-i-cover",
      imageUrl: "https://signed/cover.jpg",
    });
    expect(result[1]).toMatchObject({ id: "added-i-plain", imageUrl: null });
  });
});

// ─── Tomt og blandet ──────────────────────────────────────────────────────────

describe("buildFeedItems — kanttilfeller", () => {
  it("returnerer tom liste når alle radlister er tomme", () => {
    expect(buildFeedItems(baseInput())).toEqual([]);
  });

  it("muterer ikke inputlistene", () => {
    const sessions = [sessionRow()];
    const snapshot = JSON.parse(JSON.stringify(sessions));
    buildFeedItems(baseInput({ sessionRows: sessions }));
    expect(sessions).toEqual(snapshot);
  });
});
