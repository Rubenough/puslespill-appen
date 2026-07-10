// Ren sammenslåing av feed-hendelser: fire radtyper fra Supabase → sortert FeedItem[].
// Holdes fri for I/O slik at logikken kan enhetstestes (se __tests__/feed.test.ts);
// FeedScreen henter radene, profiler og signerte URL-er og kaller buildFeedItems.
import i18n from "../lib/i18n";
import { type ItemType } from "./collections";

// Felles type for alle feed-hendelser
export type FeedItem =
  | {
      id: string;
      type: "started";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      withUsers: string[];
      sessionId: string;
      imageUrl: string | null;
    }
  | {
      id: string;
      type: "completed";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      sessionId: string;
      imageUrl: string | null;
    }
  | {
      id: string;
      type: "added";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      ownerId: string;
      isOwn: boolean;
      imageUrl: string | null;
    }
  | {
      id: string;
      type: "loaned";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      loanedTo?: string;
    }
  | {
      id: string;
      type: "borrowed";
      timestamp: string;
      userName: string;
      avatarUrl: string | null;
      itemType: ItemType;
      itemTitle: string;
      fromName: string;
    };

// Radformer for de sammenslåtte Supabase-spørringene (item-join kommer som objekt).
export type ItemJoin = { title: string; type: ItemType } | null;
export type SessionRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  guest_names: string[] | null;
  created_by: string;
  image_url: string | null;
  items: ItemJoin;
};
export type ItemRow = {
  id: string;
  title: string;
  type: ItemType;
  created_at: string;
  owner_id: string;
  cover_url: string | null;
};
export type LoanRow = {
  id: string;
  borrower_name: string | null;
  loaned_at: string;
  items: ItemJoin;
};
export type BorrowRow = {
  id: string;
  owner_id: string;
  responded_at: string | null;
  items: ItemJoin;
};
export type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

export type BuildFeedItemsInput = {
  userId: string;
  sessionRows: SessionRow[];
  itemRows: ItemRow[];
  loanRows: LoanRow[];
  borrowRows: BorrowRow[];
  // id → profil for alle brukere som forekommer i radene (inkl. brukeren selv).
  profilesById: Map<string, ProfileRow>;
  // økt-ID → lagringssti for øktens visningsbilde (siste fremgangsbilde eller cover).
  imagePathBySession: Map<string, string>;
  // lagringssti → signert URL (økt-bilder og gjenstands-omslag).
  signedByPath: Map<string, string>;
};

// Manglende item-join skal aldri velte feeden — fall tilbake til en gyldig type.
const FALLBACK_ITEM_TYPE: ItemType = "puslespill";

// Slår de fire radtypene sammen til én liste, beriket med profiler og signerte
// bilde-URL-er, sortert nyeste hendelse først.
export function buildFeedItems({
  userId,
  sessionRows,
  itemRows,
  loanRows,
  borrowRows,
  profilesById,
  imagePathBySession,
  signedByPath,
}: BuildFeedItemsInput): FeedItem[] {
  const feedItems: FeedItem[] = [];

  // Sessions → "started" eller "completed"
  for (const s of sessionRows) {
    const profile = profilesById.get(s.created_by);
    const path = imagePathBySession.get(s.id);
    const base = {
      userName: profile?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: profile?.avatar_url ?? null,
      itemType: s.items?.type ?? FALLBACK_ITEM_TYPE,
      itemTitle: s.items?.title ?? "",
      sessionId: s.id,
      imageUrl: path ? (signedByPath.get(path) ?? null) : null,
    };

    if (s.completed_at) {
      feedItems.push({
        id: `completed-${s.id}`,
        type: "completed",
        timestamp: s.completed_at,
        ...base,
      });
    } else {
      feedItems.push({
        id: `started-${s.id}`,
        type: "started",
        timestamp: s.started_at,
        ...base,
        withUsers: s.guest_names ?? [],
      });
    }
  }

  // Items → "added"
  for (const item of itemRows) {
    const profile = profilesById.get(item.owner_id);
    feedItems.push({
      id: `added-${item.id}`,
      type: "added",
      timestamp: item.created_at,
      userName: profile?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: profile?.avatar_url ?? null,
      itemType: item.type,
      itemTitle: item.title,
      ownerId: item.owner_id,
      isOwn: item.owner_id === userId,
      imageUrl: item.cover_url ? (signedByPath.get(item.cover_url) ?? null) : null,
    });
  }

  // Lån → "loaned"
  const self = profilesById.get(userId); // egne lån/innlån — profilen er brukeren selv
  for (const loan of loanRows) {
    feedItems.push({
      id: `loaned-${loan.id}`,
      type: "loaned",
      timestamp: loan.loaned_at,
      userName: self?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: self?.avatar_url ?? null,
      itemType: loan.items?.type ?? FALLBACK_ITEM_TYPE,
      itemTitle: loan.items?.title ?? "",
      loanedTo: loan.borrower_name ?? undefined,
    });
  }

  // Godkjente forespørsler → "borrowed" (egen låneaktivitet)
  for (const req of borrowRows) {
    if (!req.responded_at) continue;
    const owner = profilesById.get(req.owner_id);
    feedItems.push({
      id: `borrowed-${req.id}`,
      type: "borrowed",
      timestamp: req.responded_at,
      userName: self?.full_name ?? i18n.t("common.unknownUser"),
      avatarUrl: self?.avatar_url ?? null,
      itemType: req.items?.type ?? FALLBACK_ITEM_TYPE,
      itemTitle: req.items?.title ?? "",
      fromName: owner?.full_name ?? i18n.t("common.unknownUser"),
    });
  }

  // Sorter nyeste hendelse øverst
  feedItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return feedItems;
}
