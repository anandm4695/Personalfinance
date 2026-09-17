import { createBrowserClient } from "@supabase/ssr";

// Captured synchronously, before createBrowserClient() below constructs the
// GoTrueClient — its own init (detectSessionInUrl) reads and strips any
// #access_token/#error hash from the URL asynchronously, so anything that reads
// window.location.hash later (e.g. Auth.tsx, on the first React render) can lose
// the race and see it already gone. Read it once, here, first.
export const capturedUrlHash = typeof window !== "undefined" ? window.location.hash : "";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isSupabaseReady = Boolean(
  SUPABASE_URL &&
    !SUPABASE_URL.includes("placeholder") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("placeholder")
);

export const supabase = createBrowserClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder"
);
