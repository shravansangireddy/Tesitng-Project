// Parent-managed kid logins for Learn & Play Champion.
//
// A signed-in grown-up calls this function to create, reset, or delete a
// kid login. The kid signs in with a username + password; behind the
// scenes the kid is a normal Supabase auth user whose email is the
// synthetic username@kids.learnplaychampion.com, so the kid needs no
// email address and gets their own learner_progress row. The public
// kid_accounts table links the kid's auth user to the parent.
//
// Only fetch + the service-role key are used (no external imports), and
// domain errors are returned as HTTP 200 with an { error } body so the
// browser client (supabase-js functions.invoke) can show the message.
// Unauthenticated calls never reach here: the platform verifies the JWT.

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

const KID_EMAIL_DOMAIN = "kids.learnplaychampion.com";
const GRADE_IDS = ["prek", "k", "1", "2", "3", "4", "5"];
const MAX_KID_ACCOUNTS = 6;

function json(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string): Response {
  return json({ error: message });
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

async function kidRows(query: string): Promise<Record<string, unknown>[]> {
  const response = await rest(`kid_accounts?${query}`, { method: "GET" });
  if (!response.ok) throw new Error("Could not read kid accounts.");
  const rows = (await response.json()) as unknown;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

async function requireParent(request: Request): Promise<string | Response> {
  const caller = await callerId(request);
  if (!caller) return fail("Please sign in as a grown-up first.");
  const own = await kidRows(
    `kid_user_id=eq.${caller}&select=kid_user_id&limit=1`,
  );
  if (own.length > 0)
    return fail("Kid logins are managed from a grown-up account.");
  return caller;
}

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 20);
}

function passwordError(value: unknown): string {
  if (typeof value !== "string" || value.length < 8)
    return "Use a password with at least 8 characters.";
  if (value.length > 72) return "That password is too long.";
  return "";
}

async function deleteAuthUser(kidUserId: string): Promise<boolean> {
  const response = await fetch(
    `${env("SUPABASE_URL")}/auth/v1/admin/users/${kidUserId}`,
    { method: "DELETE", headers: serviceHeaders() },
  );
  return response.ok;
}

async function createKid(
  parentId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const username =
    typeof body.username === "string"
      ? body.username.trim().toLowerCase()
      : "";
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return fail(
      "Usernames use 3–20 lowercase letters, numbers, or underscores.",
    );
  const displayName = cleanName(body.displayName);
  if (!displayName) return fail("Add your child's first name or nickname.");
  const grade = typeof body.grade === "string" ? body.grade : "";
  if (!GRADE_IDS.includes(grade)) return fail("Choose a grade.");
  const passwordIssue = passwordError(body.password);
  if (passwordIssue) return fail(passwordIssue);

  const siblings = await kidRows(
    `parent_id=eq.${parentId}&select=kid_user_id&limit=${MAX_KID_ACCOUNTS + 1}`,
  );
  if (siblings.length >= MAX_KID_ACCOUNTS)
    return fail(`A grown-up account can have up to ${MAX_KID_ACCOUNTS} kid logins.`);

  const taken = await kidRows(
    `username=eq.${encodeURIComponent(username)}&select=kid_user_id&limit=1`,
  );
  if (taken.length > 0)
    return fail("That username is already taken. Try another one.");

  const created = await fetch(`${env("SUPABASE_URL")}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      email: `${username}@${KID_EMAIL_DOMAIN}`,
      password: body.password,
      email_confirm: true,
      user_metadata: { account_type: "kid", display_name: displayName },
    }),
  });
  if (!created.ok) {
    const detail = (await created.json().catch(() => ({}))) as {
      msg?: string;
      message?: string;
    };
    const text = detail.msg ?? detail.message ?? "";
    if (/already|exists|registered/i.test(text))
      return fail("That username is already taken. Try another one.");
    return fail("Could not create the kid login. Please try again.");
  }
  const user = (await created.json()) as { id: string };

  const inserted = await rest("kid_accounts", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      kid_user_id: user.id,
      parent_id: parentId,
      username,
      display_name: displayName,
      grade,
    }),
  });
  if (!inserted.ok) {
    await deleteAuthUser(user.id);
    return fail("Could not save the kid login. Please try again.");
  }
  return json({
    kid: {
      kidUserId: user.id,
      parentId,
      username,
      displayName,
      grade,
    },
  });
}

async function ownsKid(parentId: string, kidUserId: unknown): Promise<boolean> {
  if (typeof kidUserId !== "string" || !kidUserId) return false;
  const rows = await kidRows(
    `kid_user_id=eq.${kidUserId}&parent_id=eq.${parentId}&select=kid_user_id&limit=1`,
  );
  return rows.length > 0;
}

async function resetPassword(
  parentId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const passwordIssue = passwordError(body.password);
  if (passwordIssue) return fail(passwordIssue);
  if (!(await ownsKid(parentId, body.kidUserId)))
    return fail("That kid login was not found under your account.");
  const updated = await fetch(
    `${env("SUPABASE_URL")}/auth/v1/admin/users/${body.kidUserId as string}`,
    {
      method: "PUT",
      headers: serviceHeaders(),
      body: JSON.stringify({ password: body.password }),
    },
  );
  if (!updated.ok) return fail("Could not reset the password. Try again.");
  return json({ ok: true });
}

async function deleteKid(
  parentId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!(await ownsKid(parentId, body.kidUserId)))
    return fail("That kid login was not found under your account.");
  if (!(await deleteAuthUser(body.kidUserId as string)))
    return fail("Could not delete the kid login. Try again.");
  return json({ ok: true });
}

async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return fail("Use POST.");
  try {
    const parent = await requireParent(request);
    if (parent instanceof Response) return parent;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.action === "create") return await createKid(parent, body);
    if (body.action === "reset_password")
      return await resetPassword(parent, body);
    if (body.action === "delete") return await deleteKid(parent, body);
    return fail("Unknown kid-login action.");
  } catch {
    return fail("Something went wrong with kid logins. Please try again.");
  }
}

Deno.serve(handler);
