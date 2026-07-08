import { supabase } from "../lib/supabase";

// Faste hurtig-reaksjoner som vises på økt-kort i feeden. 🧩 er tematisk.
export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "🧩"] as const;

export type Reaction = { emoji: string; count: number; mine: boolean };

// Henter reaksjoner for flere økter i ett kall og grupperer per økt → emoji.
// RLS gjør at bare reaksjoner på økter du kan se returneres (egen eller venns).
export async function fetchReactionsBySession(
  sessionIds: string[],
  userId: string,
): Promise<Map<string, Reaction[]>> {
  const result = new Map<string, Reaction[]>();
  if (sessionIds.length === 0) return result;

  const { data, error } = await supabase
    .from("session_reactions")
    .select("session_id, emoji, user_id")
    .in("session_id", sessionIds);
  if (error) throw error;

  // session_id → (emoji → aggregat)
  const bySession = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const row of data ?? []) {
    let byEmoji = bySession.get(row.session_id);
    if (!byEmoji) {
      byEmoji = new Map();
      bySession.set(row.session_id, byEmoji);
    }
    const cur = byEmoji.get(row.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (row.user_id === userId) cur.mine = true;
    byEmoji.set(row.emoji, cur);
  }

  for (const [sessionId, byEmoji] of bySession) {
    result.set(
      sessionId,
      [...byEmoji.entries()].map(([emoji, v]) => ({
        emoji,
        count: v.count,
        mine: v.mine,
      })),
    );
  }
  return result;
}

// Slår en reaksjon av/på for gjeldende bruker. RLS sikrer at bare egne rader endres;
// unik-indeksen (session_id, user_id, emoji) hindrer duplikater.
export async function toggleReaction(
  sessionId: string,
  emoji: string,
  userId: string,
  mine: boolean,
): Promise<void> {
  if (mine) {
    const { error } = await supabase
      .from("session_reactions")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("session_reactions")
      .insert({ session_id: sessionId, user_id: userId, emoji });
    if (error) throw error;
  }
}

// Ren, optimistisk oppdatering av én økts reaksjonsliste (brukes før serverkallet
// og er lett å teste). `mine` er brukerens nåværende tilstand for emojien.
export function applyToggle(list: Reaction[], emoji: string, mine: boolean): Reaction[] {
  const idx = list.findIndex((r) => r.emoji === emoji);
  if (idx === -1) {
    // Ikke til stede ennå → legg til min reaksjon.
    return [...list, { emoji, count: 1, mine: true }];
  }
  const current = list[idx];
  const nextCount = current.count + (mine ? -1 : 1);
  const next = [...list];
  if (nextCount <= 0) {
    next.splice(idx, 1); // siste reaksjon fjernet → dropp raden
  } else {
    next[idx] = { emoji, count: nextCount, mine: !mine };
  }
  return next;
}
