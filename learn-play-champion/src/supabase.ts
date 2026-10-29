import { createClient } from "@supabase/supabase-js";
import { privacy } from "./privacy";

export function validateSupabaseConfig(url: string, key: string): string {
  if (
    !url ||
    !key ||
    url.includes("YOUR_PROJECT") ||
    key.includes("YOUR_SUPABASE")
  ) {
    return "Account sign-in needs a Supabase project. Add the public project settings to .env.local, run the included database migration, then restart the app.";
  }
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return "The Supabase project URL must be an HTTPS URL without credentials, query parameters, or a fragment.";
    }
  } catch {
    return "The Supabase project URL is invalid. Check VITE_SUPABASE_URL.";
  }
  if (key.startsWith("sb_secret_")) {
    return "Use a Supabase publishable key, never a secret or service-role key, in browser configuration.";
  }
  if (!key.startsWith("sb_publishable_")) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon")
        throw new Error("Not an anonymous public key");
    } catch {
      return "Use a Supabase publishable key or legacy anon key, not a private service-role key.";
    }
  }
  return "";
}

const env = import.meta.env;
const url = env.VITE_SUPABASE_URL?.trim() || "";
const key =
  (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim() ||
  "";
export const configError = validateSupabaseConfig(url, key) || privacy.error;
export const supabase = configError
  ? null
  : createClient(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
