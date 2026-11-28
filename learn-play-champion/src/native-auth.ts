import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";

// Native-shell helpers for the Capacitor Android/iOS builds. The web build
// served at learnplaychampion.com never takes the native branch:
// Capacitor.isNativePlatform() is false there, so web behaviour is
// unchanged by anything in this module.

// Custom scheme the native app listens on (Capacitor App plugin,
// appUrlOpen). Email-link sign-ins and password resets redirect here so
// they open inside the app instead of a browser tab. The scheme still has
// to be allowlisted in Supabase Auth redirect URLs (dashboard step)
// before such links are sent.
export const NATIVE_AUTH_SCHEME = "learnplaychampion://";
export const NATIVE_AUTH_REDIRECT = "learnplaychampion://auth";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

// Handle a URL the native shell received on the app scheme. Returns true
// when the URL was an auth link for this app (handled here), false when it
// was not one (the caller ignores it). Mirrors the web sign-in callback
// handling in Account.tsx: a PKCE `code` is exchanged for a session, an
// implicit-flow token pair in the hash is set directly, and a link error
// is reported the same way.
export async function handleNativeAuthUrl(
  url: string,
  client: SupabaseClient,
  onError: (message: string) => void,
): Promise<boolean> {
  if (!url.startsWith(NATIVE_AUTH_SCHEME)) return false;
  try {
    const incoming = new URL(url);
    const code = incoming.searchParams.get("code");
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) onError(`Sign-in link failed: ${error.message}. Request a new email link.`);
      return true;
    }
    const hash = new URLSearchParams(incoming.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) onError(`Sign-in link failed: ${error.message}. Request a new email link.`);
      return true;
    }
    const linkError =
      incoming.searchParams.get("error_description") ||
      hash.get("error_description");
    if (linkError) onError(`Sign-in link failed: ${linkError}. Request a new email link.`);
    return true;
  } catch (error) {
    onError(
      `Sign-in link failed: ${error instanceof Error ? error.message : String(error)}. Request a new email link.`,
    );
    return true;
  }
}
