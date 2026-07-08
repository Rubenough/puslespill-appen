import { fetchFriends } from "../friends";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockedFrom = supabase.from as jest.Mock;

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
};
type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

// Bygger et supabase-mock som svarer med gitte rader for friendships og profiles.
// friendships-kjeden: from().select().eq().or() → thenable som gir friendshipRows.
// profiles-kjeden: from().select().in() → thenable som gir profileRows.
function mockSupabase(friendshipRows: FriendshipRow[], profileRows: ProfileRow[]) {
  mockedFrom.mockImplementation((table: string) => {
    if (table === "friendships") {
      const chain = {
        select: () => chain,
        eq: () => chain,
        or: () => Promise.resolve({ data: friendshipRows, error: null }),
      };
      return chain;
    }
    if (table === "profiles") {
      const chain = {
        select: () => chain,
        in: () => Promise.resolve({ data: profileRows, error: null }),
      };
      return chain;
    }
    throw new Error(`uventet tabell: ${table}`);
  });
}

beforeEach(() => {
  mockedFrom.mockReset();
});

describe("fetchFriends", () => {
  it("plukker motparten når brukeren er requester", async () => {
    mockSupabase(
      [{ id: "f1", requester_id: "me", addressee_id: "kari" }],
      [{ id: "kari", full_name: "Kari", avatar_url: "kari.jpg" }],
    );

    const friends = await fetchFriends("me");

    expect(friends).toEqual([
      { friendshipId: "f1", id: "kari", name: "Kari", avatarUrl: "kari.jpg" },
    ]);
  });

  it("plukker motparten når brukeren er addressee", async () => {
    mockSupabase(
      [{ id: "f1", requester_id: "ola", addressee_id: "me" }],
      [{ id: "ola", full_name: "Ola", avatar_url: null }],
    );

    const friends = await fetchFriends("me");

    expect(friends).toEqual([
      { friendshipId: "f1", id: "ola", name: "Ola", avatarUrl: null },
    ]);
  });

  it("gir null-navn og null-avatar når profilen mangler", async () => {
    mockSupabase([{ id: "f1", requester_id: "me", addressee_id: "ghost" }], []);

    const friends = await fetchFriends("me");

    expect(friends).toEqual([
      { friendshipId: "f1", id: "ghost", name: null, avatarUrl: null },
    ]);
  });

  it("sorterer venner alfabetisk med norsk locale (æ/ø/å sist)", async () => {
    mockSupabase(
      [
        { id: "f1", requester_id: "me", addressee_id: "aa" },
        { id: "f2", requester_id: "bb", addressee_id: "me" },
        { id: "f3", requester_id: "me", addressee_id: "cc" },
      ],
      [
        { id: "aa", full_name: "Øyvind", avatar_url: null },
        { id: "bb", full_name: "Anna", avatar_url: null },
        { id: "cc", full_name: "Bjørn", avatar_url: null },
      ],
    );

    const friends = await fetchFriends("me");

    expect(friends.map((f) => f.name)).toEqual(["Anna", "Bjørn", "Øyvind"]);
  });
});
