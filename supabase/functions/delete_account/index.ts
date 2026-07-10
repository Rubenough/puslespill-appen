// delete_account — App Store 5.1.1(v) / Google Play data-deletion hard gate.
//
// Sletter innlogget brukers konto og ALT tilhørende innhold:
//   1. Samler alle lagringsstier som blir foreldreløse (egen mappe, andres
//      progresjonsbilder på egne økter, egne item-covers).
//   2. Rydder loans-rader som har NO ACTION-FK til profiles (egne utlån slettes;
//      borrower_user_id nulles der brukeren er låntaker — eierens frie tekstnavn
//      er eierens egen notat og består).
//   3. Sletter session_images-rader som peker på brukerens filer på ANDRES økter
//      (filene fjernes i steg 4; radene ville ellers pekt i løse luften).
//   4. Sletter auth-brukeren — profiles har ON DELETE CASCADE fra auth.users, og
//      resten (items → loans/sessions → session_images/participants/reactions,
//      borrow_requests, friendships) kaskaderer fra profiles/items.
//   5. Fjerner de innsamlede filene fra session-images-bucketen (best effort).
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
    // 1. Lagringsstier som skal bort.
    const paths = new Set<string>(await listAllFiles(admin, uid));

    const { data: ownSessionImgs } = await admin
      .from("session_images")
      .select("image_url, sessions!inner(created_by)")
      .eq("sessions.created_by", uid);
    for (const r of ownSessionImgs ?? []) {
      if (r.image_url && !r.image_url.startsWith("http")) paths.add(r.image_url);
    }

    const { data: ownItems } = await admin
      .from("items")
      .select("cover_url")
      .eq("owner_id", uid)
      .not("cover_url", "is", null);
    for (const r of ownItems ?? []) {
      if (r.cover_url && !r.cover_url.startsWith("http")) paths.add(r.cover_url);
    }

    // 2. loans har NO ACTION-FK til profiles — rydd eksplisitt.
    const { error: loansDelErr } = await admin.from("loans").delete().eq("owner_id", uid);
    if (loansDelErr) throw loansDelErr;
    const { error: loansUnlinkErr } = await admin
      .from("loans")
      .update({ borrower_user_id: null })
      .eq("borrower_user_id", uid);
    if (loansUnlinkErr) throw loansUnlinkErr;

    // 3. Egne bilder lagt til på ANDRES økter: radene kaskaderer ikke, filene slettes
    //    i steg 5 — fjern radene så de ikke peker på slettede filer.
    const { error: strayImgErr } = await admin
      .from("session_images")
      .delete()
      .like("image_url", `${uid}/%`);
    if (strayImgErr) throw strayImgErr;

    // 4. Slett auth-brukeren; profiles (og videre) kaskaderer.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;

    // 5. Fjern filene (best effort — radene er allerede borte).
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
