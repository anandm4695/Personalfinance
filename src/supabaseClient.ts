import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY ?? "";

export const isSupabaseReady = Boolean(
  supabaseUrl && !supabaseUrl.includes("placeholder") &&
  supabaseAnonKey && !supabaseAnonKey.includes("placeholder")
);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);
