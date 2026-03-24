import { createClient } from "@supabase/supabase-js";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

// SecureStore har en grense på 2048 bytes per nøkkel.
// Supabase-sesjonstokens kan være større, så vi deler dem opp i biter.
const CHUNK_SIZE = 2000;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const numChunksStr = await getItemAsync(`${key}_numChunks`);
    if (!numChunksStr) {
      return getItemAsync(key);
    }
    const numChunks = parseInt(numChunksStr, 10);
    const chunks = await Promise.all(
      Array.from({ length: numChunks }, (_, i) => getItemAsync(`${key}_chunk_${i}`))
    );
    if (chunks.some((c) => c === null)) return null;
    return chunks.join("");
  },
  setItem: async (key: string, value: string) => {
    if (value.length <= CHUNK_SIZE) {
      await deleteItemAsync(`${key}_numChunks`).catch(() => {});
      return setItemAsync(key, value);
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await setItemAsync(`${key}_numChunks`, String(chunks.length));
    await Promise.all(chunks.map((chunk, i) => setItemAsync(`${key}_chunk_${i}`, chunk)));
  },
  removeItem: async (key: string) => {
    const numChunksStr = await getItemAsync(`${key}_numChunks`);
    if (numChunksStr) {
      const numChunks = parseInt(numChunksStr, 10);
      await deleteItemAsync(`${key}_numChunks`);
      await Promise.all(
        Array.from({ length: numChunks }, (_, i) => deleteItemAsync(`${key}_chunk_${i}`))
      );
    }
    return deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
