// delete_account — App Store 5.1.1(v) / Google Play data-deletion hard gate.
//
// Rekkefølgen er valgt så INGENTING destruktivt skjer før selve kontoslettingen:
//   1. READ-ONLY: samle lagringsstier som blir foreldreløse (egen mappe, alle
//      bilder på egne økter, egne item-covers) og ID-ene til egne bilderader på
//      ANDRES økter. Eldre rader kan holde fulle URL-er — normaliseres med samme
//      logikk som appens utils/sessionImages.toStoragePath.
//   2. auth.admin.deleteUser — det atomiske punktet. profiles kaskaderer fra
//      auth.users, og videre: items → loans (eier-lån via item-kaskaden;
//      borrower_user_id er ON DELETE SET NULL siden 2026-07-12-migrasjonen),
//      sessions → session_images/participants/reactions, borrow_requests,
//      friendships. Feiler dette, er INGEN data rørt.
//   3. Best effort etterpå: slett de innsamlede bilderadene på andres økter
//      (kaskaderer ikke) og fjern filene fra bucketen. Feil logges — kontoen
//      er uansett borte, og rester kan ryddes manuelt fra dashboardet.
//
// Deployes med verify_jwt=true; bruker-id leses fra JWT-en. Kjører med service role.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "session-images";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Speiler appens utils/sessionImages.toStoragePath: godtar en ren sti ELLER en
// eldre full (signert/offentlig) URL og gir tilbake stien i bucketen.
function toStoragePath(value: string | null): string | null {
  if (!value) return null;
  const marker = `/${BUCKET}/`;
  const raw = value.includes(marker) ? (value.split(marker)[1] ?? "") : value;
  const path = raw.split("?")[0];
  return path || null;
}

// Rekursiv listing av alle filer under et prefiks (list() er per «mappe»).
async function listAllFiles(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [prefix];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let offset = 0;
    const limit = 100;
    for (;;) {
      const { data, error } = await admin.storage.from(BUCKET).list(dir, { limit, offset });
      if (error) throw error;
      for (const entry of data ?? []) {
        const path = dir ? `${dir}/${entry.name}` : entry.name;
        // Filer har id; «mapper» (prefikser) har id === null.
        if (entry.id) out.push(path);
        else stack.push(path);
      }
      if (!data || data.length < limit) break;
      offset += limit;
    }
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const uid = userData.user.id;

  try {
    // ── 1. READ-ONLY innsamling ─────────────────────────────────────────────
    const paths = new Set<string>();
    const ownPrefix = `${uid}/`;

    // Alt under brukerens egen mappe.
    for (const p of await listAllFiles(admin, uid)) paths.add(p);

    // Alle bilder (også venners) på brukerens egne økter — radene kaskaderer,
    // filene under venners mapper gjør ikke det.
    const [ownSessionImgs, ownItems, strayRows] = await Promise.all([
      admin
        .from("session_images")
        .select("image_url, sessions!inner(created_by)")
        .eq("sessions.created_by", uid),
      admin.from("items").select("cover_url").eq("owner_id", uid).not("cover_url", "is", null),
      // Brukerens egne bilderader på ANDRES økter: sti-form ELLER eldre URL-form.
      admin
        .from("session_images")
        .select("id, image_url")
        .or(`image_url.like.${ownPrefix}%,image_url.like.%/${BUCKET}/${ownPrefix}%`),
    ]);
    if (ownSessionImgs.error) throw ownSessionImgs.error;
    if (ownItems.error) throw ownItems.error;
    if (strayRows.error) throw strayRows.error;

    for (const r of ownSessionImgs.data ?? []) {
      const p = toStoragePath(r.image_url);
      if (p) paths.add(p);
    }
    for (const r of ownItems.data ?? []) {
      const p = toStoragePath(r.cover_url);
      if (p) paths.add(p);
    }
    const strayIds = (strayRows.data ?? [])
      .filter((r) => toStoragePath(r.image_url)?.startsWith(ownPrefix))
      .map((r) => r.id);

    // ── 2. Det atomiske punktet — før dette er ingen data rørt ─────────────
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;

    // ── 3. Best effort-opprydding (kontoen er alt borte) ────────────────────
    if (strayIds.length > 0) {
      const { error: strayErr } = await admin.from("session_images").delete().in("id", strayIds);
      if (strayErr) console.error("[delete_account] stray row cleanup failed", strayErr.message);
    }
    const all = [...paths];
    for (let i = 0; i < all.length; i += 100) {
      const { error: rmErr } = await admin.storage.from(BUCKET).remove(all.slice(i, i + 100));
      if (rmErr) console.error("[delete_account] storage remove failed", rmErr.message);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[delete_account] failed for", uid, e);
    return json({ error: "delete_failed" }, 500);
  }
});
