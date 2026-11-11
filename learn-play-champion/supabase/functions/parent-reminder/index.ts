// "Remind to add kids" email for Learn & Play Champion.
//
// The administrator calls this from the Registered parents panel
// (Parents dashboard) for one registered grown-up at a time. The
// function sends that grown-up a short motivational reminder — their
// child's free practice is waiting; adding the kid's login takes
// about a minute — and records the send in
// public.parent_reminder_log, which is where the panel's per-parent
// reminder status (count + last sent) comes from.
//
// Decisions, in order:
//   * the caller must be signed in (a JWT the auth API accepts),
//     else 401 { sent: false, reason: "unauthenticated" };
//   * the caller must be a server-assigned payment administrator —
//     the same public.payment_admins membership is_payment_admin()
//     checks — else 403 { sent: false, reason: "not-admin" };
//     administrators are assigned in the database, never in the app,
//     so this list cannot be self-granted;
//   * the target must be a real account, else
//     { sent: false, reason: "parent-not-found" };
//   * the target must be a grown-up: a kid login (its id appears in
//     public.kid_accounts, the same detection the welcome-email
//     function uses; the synthetic @kids.learnplaychampion.com
//     address is refused too) gets 403
//     { sent: false, reason: "kid-account" } — kids are reminded
//     through their grown-ups, never emailed directly;
//   * mail that is not configured yet reports
//     { sent: false, reason: "not-configured" } and is NOT logged,
//     so the status in the panel stays truthful.
//
// The log row is written only after a successful send, and history
// is kept (one row per send) so repeat reminders show a count.
// Outcomes are HTTP 200 JSON { sent, reason? } except the two
// refusals above, matching the welcome-email function's style.

import { sendEmail } from "../_shared/mailer.ts";
import { buildParentReminderEmail } from "../_shared/reminder.ts";

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

async function authUserEmail(userId: string): Promise<string | null> {
  const response = await fetch(
    `${env("SUPABASE_URL")}/auth/v1/admin/users/${userId}`,
    { headers: serviceHeaders() },
  );
  if (!response.ok) return null;
  const user = (await response.json()) as { email?: unknown };
  return typeof user.email === "string" ? user.email : null;
}

async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST")
    return json({ sent: false, reason: "use-post" });
  try {
    const caller = await callerId(request);
    if (!caller) return json({ sent: false, reason: "unauthenticated" }, 401);

    // Payment administrators only — the same membership check
    // is_payment_admin() performs against public.payment_admins.
    const admin = await rows(
      `payment_admins?user_id=eq.${caller}&select=user_id&limit=1`,
    );
    if (admin.length === 0)
      return json({ sent: false, reason: "not-admin" }, 403);

    const body = (await request.json().catch(() => null)) as {
      parentUserId?: unknown;
    } | null;
    const parentUserId =
      body && typeof body.parentUserId === "string" ? body.parentUserId : "";
    if (!parentUserId)
      return json({ sent: false, reason: "parent-not-found" });

    const email = await authUserEmail(parentUserId);
    if (!email) return json({ sent: false, reason: "parent-not-found" });

    // Grown-ups only: kid logins are never emailed directly.
    const kid = await rows(
      `kid_accounts?kid_user_id=eq.${parentUserId}&select=kid_user_id&limit=1`,
    );
    if (kid.length > 0 || email.endsWith("@kids.learnplaychampion.com"))
      return json({ sent: false, reason: "kid-account" }, 403);

    const reminder = buildParentReminderEmail();
    const result = await sendEmail({
      to: email,
      subject: reminder.subject,
      text: reminder.text,
      html: reminder.html,
    });
    if (!result.sent) return json({ sent: false, reason: result.reason });

    // Log only after a successful send; history is kept, one row per
    // send. Losing the log write itself is acceptable (the panel's
    // count would lag one send) and must not fail this call — the
    // email the administrator asked for did go out.
    await rest("parent_reminder_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ parent_user_id: parentUserId }),
    }).catch(() => undefined);
    return json({ sent: true });
  } catch {
    return json({ sent: false, reason: "something-went-wrong" });
  }
}

Deno.serve(handler);
