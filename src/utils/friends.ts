import { supabase } from "../lib/supabase";
import { resolveAvatarUrls } from "./avatar";

export type Friend = {
  friendshipId: string;
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

// Henter aksepterte venner for en bruker: vennskap → motpart → profil.
// Kaster ved feil (kall-siden håndterer feiltilstand).
export async function fetchFriends(userId: string): Promise<Friend[]> {
  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("status", "accepted")
    // Defense-in-depth: begrens til rader der brukeren er part (RLS håndhever også).
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;

  // Motparten i hvert vennskap er den som ikke er meg.
  const friendIdByFriendship = new Map<string, string>();
  for (const row of rows ?? []) {
    const otherId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    friendIdByFriendship.set(row.id, otherId);
  }

  const otherIds = [...new Set(friendIdByFriendship.values())];
  let profilesById = new Map<
    string,
    { full_name: string | null; avatar_url: string | null }
  >();
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", otherIds);
    profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
  }

  // avatar_url kan være en Google-URL eller en opplastet lagringssti — løs opp
  // til visbare URL-er i én batch, så alle konsumenter kan bruke verdien direkte.
  const avatarByValue = await resolveAvatarUrls(
    [...profilesById.values()].map((p) => p.avatar_url),
  );

  const list: Friend[] = [];
  for (const [friendshipId, friendId] of friendIdByFriendship) {
    const profile = profilesById.get(friendId);
    list.push({
      friendshipId,
      id: friendId,
      name: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url
        ? (avatarByValue.get(profile.avatar_url) ?? null)
        : null,
    });
  }
  list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "nb"));
  return list;
}
