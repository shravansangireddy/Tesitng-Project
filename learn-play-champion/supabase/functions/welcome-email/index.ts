// Parent welcome email for Learn & Play Champion.
//
// The client calls this once per page session when a signed-in grown-up
// session is established (kid-login sessions and guests never call it).
// The function decides whether a welcome is due:
//
//   * the caller must be a grown-up — a kid login (its id appears in
//     public.kid_accounts) is refused with a 403;
//   * a public.welcome_email_log row for (caller, 'parent_welcome')
//     means the welcome already went out — { sent: false,
//     reason: "already-sent" };
//   * an account older than the window in _shared/welcome.ts is not
//     welcomed — { sent: false, reason: "not-new" } — so long-standing
//     families are never spammed when this trigger first ships;
//   * mail that is not configured yet reports
//     { sent: false, reason: "not-configured" } and is NOT logged, so
//     the welcome can still go out once the SMTP secrets are set.
//
// The log row is written only after a successful send, so a failed or
// unconfigured attempt never burns the one welcome. All outcomes except
// the kid refusal are HTTP 200 JSON { sent, reason? }, matching the
// kid-accounts function's style; the caller ignores every result anyway
// (fire-and-forget), so these reasons exist for logs and debugging.

import { sendEmail } from "../_shared/mailer.ts";
import {
  buildParentWelcomeEmail,
  isNewParentAccount,
} from "../_shared/welcome.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function serviceHeaders(): Record<string, string> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function callerId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const response = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      apikey: env("SUPABASE_ANON_KEY"),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: unknown };
  return typeof user.id === "string" ? user.id : null;
}

async function rest(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers ?? {}) },
  });
}

async function rows(path: string): Promise<Record<string, unknown>[]> {
  const response = await rest(path, { method: "GET" });
  if (!response.ok) throw new Error(`Could not read ${path}.`);
  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : [];
}

interface AuthUser {
  email: string;
  createdAt: string;
}

async function authUser(userId: string): Promise<AuthUser | null> {
  const response = await fetch(
    `${env("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
    { headers: serviceHeaders() },
  );
  if (!response.ok) return null;
  const user = (await response.json()) as {
    email?: unknown;
    created_at?: unknown;
  };
  if (typeof user.email !== "string" || typeof user.created_at !== "string")
    return null;
  return { email: user.email, createdAt: user.created_at };
}

async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST")
    return json({ sent: false, reason: "use-post" });
  try {
    const caller = await callerId(request);
    if (!caller) return json({ sent: false, reason: "unauthenticated" }, 401);

    // Kid logins are welcomed through their grown-up, never directly.
    const kid = await rows(
      `kid_accounts?kid_user_id=eq.${caller}&select=kid_user_id&limit=1`,
    );
    if (kid.length > 0)
      return json({ sent: false, reason: "kid-account" }, 403);

    const already = await rows(
      `welcome_email_log?user_id=eq.${caller}&kind=eq.parent_welcome&select=id&limit=1`,
    );
    if (already.length > 0)
      return json({ sent: false, reason: "already-sent" });

    const user = await authUser(caller);
    if (!user) return json({ sent: false, reason: "account-not-found" });
    if (!isNewParentAccount(user.createdAt, new Date()))
      return json({ sent: false, reason: "not-new" });

    const email = buildParentWelcomeEmail();
    const result = await sendEmail({
      to: user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    if (!result.sent) return json({ sent: false, reason: result.reason });

    // Log only after a successful send. resolution=ignore-duplicates
    // makes a racing second call a no-op instead of an error; losing the
    // log write itself is acceptable (worst case: one duplicate welcome
    // on a later sign-in) and must not fail this call.
    await rest("welcome_email_log", {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: caller,
        kind: "parent_welcome",
        kid_user_id: null,
      }),
    }).catch(() => undefined);
    return json({ sent: true });
  } catch {
    return json({ sent: false, reason: "something-went-wrong" });
  }
}

Deno.serve(handler);
