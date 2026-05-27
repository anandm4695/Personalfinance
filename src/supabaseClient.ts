import { createBrowserClient } from "@supabase/ssr";

const LIVE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const LIVE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const DEMO_URL = import.meta.env.VITE_SUPABASE_DEMO_URL ?? "";
const DEMO_KEY = import.meta.env.VITE_SUPABASE_DEMO_ANON_KEY ?? "";

export const isSupabaseReady = Boolean(
  LIVE_URL && !LIVE_URL.includes("placeholder") &&
  LIVE_KEY && !LIVE_KEY.includes("placeholder")
);

// True when the demo Supabase project is configured via env vars
export const isDemoDbReady = Boolean(
  DEMO_URL && !DEMO_URL.includes("placeholder") &&
  DEMO_KEY && !DEMO_KEY.includes("placeholder")
);

const _live = createBrowserClient(
  LIVE_URL || "https://placeholder.supabase.co",
  LIVE_KEY || "placeholder"
);

// createBrowserClient is a singleton in the browser — it caches the first client
// and returns it for every subsequent call.  Pass isSingleton: false so the demo
// client is always a genuinely separate instance, not an alias for _live.
const _demo = isDemoDbReady
  ? createBrowserClient(DEMO_URL, DEMO_KEY, { isSingleton: false } as any)
  : _live;

// Module-level flag — toggled by setDemoMode(), resets to false on page reload
let _isDemoMode = false;

export function setDemoMode(on: boolean): void {
  _isDemoMode = on;
}

export function getIsDemoMode(): boolean {
  return _isDemoMode;
}

// Proxy that transparently delegates every property access / method call to
// whichever client is currently active (live or demo).  All existing
// supabase.from() / supabase.auth.* calls in App.tsx work without any changes.
type SupabaseClientType = ReturnType<typeof createBrowserClient>;

export const supabase = new Proxy({} as SupabaseClientType, {
  get(_: SupabaseClientType, prop: string | symbol) {
    const client = _isDemoMode ? _demo : _live;
    const val = (client as any)[prop as string];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

// Direct sign-in to the demo Supabase, bypassing the Proxy.
// createBrowserClient shares internal cookie state between instances, so the
// Proxy cannot reliably redirect auth requests — this function calls _demo directly.
export async function signInToDemo(email: string, password: string) {
  return _demo.auth.signInWithPassword({ email, password });
}

// Direct sign-out of the demo Supabase (used when leaving demo mode).
export async function signOutOfDemo() {
  return _demo.auth.signOut();
}
