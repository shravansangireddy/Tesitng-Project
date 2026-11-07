import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Asks the welcome-email Edge Function to consider a parent welcome for
 * the signed-in grown-up. The function owns every decision (already
 * sent? account new enough? mail configured?) — this trigger only
 * guarantees the ask happens at most once per page session and only for
 * grown-up sessions: kid logins are welcomed through their grown-up, and
 * guests have no account to welcome.
 *
 * Fire-and-forget in the strongest sense: no result is read, no state
 * changes, and every failure (including a client without the functions
 * API) is ignored. A welcome email must never disturb a session.
 */
let parentWelcomeRequested = false;

export function requestParentWelcomeEmail(
  client: SupabaseClient,
  isKidSession: boolean,
): void {
  if (isKidSession || parentWelcomeRequested) return;
  parentWelcomeRequested = true;
  try {
    const pending = client.functions?.invoke("welcome-email", { body: {} });
    if (pending) void pending.catch(() => undefined);
  } catch {
    // Ignore: see the note above.
  }
}
