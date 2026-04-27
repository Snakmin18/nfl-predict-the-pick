import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

const normalizedSupabaseUrl = supabaseUrl
  ? normalizeSupabaseUrl(supabaseUrl)
  : undefined;

export const isSupabaseConfigured = Boolean(
  normalizedSupabaseUrl && supabaseAnonKey,
);

export const supabase = isSupabaseConfigured
  ? createClient(normalizedSupabaseUrl as string, supabaseAnonKey as string)
  : null;
