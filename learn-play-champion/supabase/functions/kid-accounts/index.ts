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

async function parentRows(
  query: string,
): Promise<Record<string, unknown>[]> {
  const response = await rest(`kid_account_parents?${query}`, {
    method: "GET",
  });
  if (!response.ok) throw new Error("Could not read kid account parents.");
  const rows = (await response.json()) as unknown;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

async function listAuthUsers(): Promise<{ id: string; email: string }[]> {
  const response = await fetch(
    `${env("SUPABASE_URL")}/auth/v1/admin/users?per_page=1000`,
    { headers: serviceHeaders() },
  );
  if (!response.ok) throw new Error("Could not read users.");
  const payload = (await response.json()) as {
    users?: { id?: unknown; email?: unknown }[];
  };
  return (payload.users ?? []).flatMap((user) =>
    typeof user.id === "string" && typeof user.email === "string"
      ? [{ id: user.id, email: user.email }]
      : [],
  );
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

// Kid logins use a 4-digit PIN. A bare PIN is shorter than the auth
// service's minimum password length, so the stored password is the PIN
// plus a fixed suffix — the app builds the same value when signing in
// (kidAuthPassword in src/kid-accounts.ts).
const KID_PIN_SUFFIX = "-kidpin";

function passwordError(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}$/.test(value))
    return "Use a 4-digit PIN (numbers only).";
  return "";
}

function storedPassword(pin: unknown): string {
  return `${pin as string}${KID_PIN_SUFFIX}`;
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
      password: storedPassword(body.password),
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
  const linked = await rest("kid_account_parents", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ kid_user_id: user.id, parent_id: parentId }),
  });
  if (!linked.ok) {
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
      active: true,
    },
  });
}

async function ownsKid(parentId: string, kidUserId: unknown): Promise<boolean> {
  if (typeof kidUserId !== "string" || !kidUserId) return false;
  const rows = await parentRows(
    `kid_user_id=eq.${kidUserId}&parent_id=eq.${parentId}&select=parent_id&limit=1`,
  );
  return rows.length > 0;
}

async function kidOwnerId(kidUserId: string): Promise<string> {
  const rows = await kidRows(
    `kid_user_id=eq.${kidUserId}&select=parent_id&limit=1`,
  );
  const owner = rows[0]?.parent_id;
  return typeof owner === "string" ? owner : "";
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
      body: JSON.stringify({ password: storedPassword(body.password) }),
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

async function setActive(
  parentId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (typeof body.active !== "boolean")
    return fail("Say whether the login should be on or off.");
  if (!(await ownsKid(parentId, body.kidUserId)))
    return fail("That kid login was not found under your account.");
  const kidUserId = body.kidUserId as string;
  // Pausing bans the kid's auth user (about 100 years); reactivating lifts
  // the ban. The kid_accounts.active flag mirrors the state for the app.
  const banned = await fetch(
    `${env("SUPABASE_URL")}/auth/v1/admin/users/${kidUserId}`,
    {
      method: "PUT",
      headers: serviceHeaders(),
      body: JSON.stringify({
        ban_duration: body.active ? "none" : "876000h",
      }),
    },
  );
  if (!banned.ok)
    return fail("Could not change the login. Please try again.");
  const updated = await rest(`kid_accounts?kid_user_id=eq.${kidUserId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ active: body.active }),
  });
  if (!updated.ok)
    return fail("Could not save the change. Please try again.");
  return json({ ok: true, active: body.active });
}

async function listParents(
  parentId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!(await ownsKid(parentId, body.kidUserId)))
    return fail("That kid login was not found under your account.");
  const kidUserId = body.kidUserId as string;
  const [links, users, ownerId] = await Promise.all([
    parentRows(`kid_user_id=eq.${kidUserId}&select=parent_id,created_at`),
    listAuthUsers(),
    kidOwnerId(kidUserId),
  ]);
  const emailById = new Map(users.map((user) => [user.id, user.email]));
  const parents = links
    .map((link) => link.parent_id)
    .filter((id): id is string => typeof id === "string")
    .map((id) => ({
      parentId: id,
      email: emailById.get(id) ?? "",
      isOwner: id === ownerId,
    }))
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
  return json({ parents });
}

async function shareKid(
  parentId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!(await ownsKid(parentId, body.kidUserId)))
    return fail("That kid login was not found under your account.");
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail("Enter the other grown-up's email address.");
  const users = await listAuthUsers();
  const target = users.find(
    (user) => user.email.toLowerCase() === email,
  );
  if (!target)
    return fail(
      "No grown-up account uses that email yet. They need to sign in to Learn & Play once first, then you can share.",
    );
  const kidUserId = body.kidUserId as string;
  const kidCheck = await parentRows(
    `kid_user_id=eq.${target.id}&select=kid_user_id&limit=1`,
  );
  if (kidCheck.length > 0)
    return fail("That email belongs to a kid login, not a grown-up.");
  const existing = await parentRows(
    `kid_user_id=eq.${kidUserId}&parent_id=eq.${target.id}&select=parent_id&limit=1`,
  );
  if (existing.length > 0) return json({ ok: true, already: true });
  const linked = await rest("kid_account_parents", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ kid_user_id: kidUserId, parent_id: target.id }),
  });
  if (!linked.ok)
    return fail("Could not share the kid login. Please try again.");
  return json({ ok: true });
}

async function unshareKid(
  parentId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (!(await ownsKid(parentId, body.kidUserId)))
    return fail("That kid login was not found under your account.");
  const kidUserId = body.kidUserId as string;
  const target = body.parentId;
  if (typeof target !== "string" || !target)
    return fail("Say which grown-up to remove.");
  if (target === (await kidOwnerId(kidUserId)))
    return fail("The grown-up who created this login can't be removed.");
  const removed = await rest(
    `kid_account_parents?kid_user_id=eq.${kidUserId}&parent_id=eq.${target}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
  if (!removed.ok)
    return fail("Could not remove that grown-up. Please try again.");
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
    if (body.action === "set_active") return await setActive(parent, body);
    if (body.action === "parents") return await listParents(parent, body);
    if (body.action === "share") return await shareKid(parent, body);
    if (body.action === "unshare") return await unshareKid(parent, body);
    return fail("Unknown kid-login action.");
  } catch {
    return fail("Something went wrong with kid logins. Please try again.");
  }
}

Deno.serve(handler);
