// Isolated PostgreSQL checks only. This never connects to a real Supabase project.
// Verifies parent reminders (migration 202611090001): the
// parent_reminder_log table's shape and lock-down (RLS on, client
// roles denied, service role can write), and that
// admin_registered_parents() keeps its is_payment_admin() guard while
// its rows now carry reminder_count / last_reminder_at derived from
// the log — 0/null for a parent never reminded, exact count and
// latest timestamp for parents reminded once or twice — with kid
// accounts still never appearing as rows.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function asUser(user, sql, args = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${user}';`);
  try { return await db.query(sql, args); }
  finally { await db.exec("reset role; reset request.jwt.claim.sub;"); }
}
async function asRole(role, sql, args = []) {
  await db.exec(`set role ${role};`);
  try { return await db.query(sql, args); }
  finally { await db.exec("reset role;"); }
}
async function parents(user) {
  return (await asUser(user, "select * from public.admin_registered_parents()")).rows;
}
async function addUser(user, email, createdAt) {
  await db.query("insert into auth.users(id, email, created_at) values ($1, $2, $3)", [user, email, createdAt]);
}
async function addKid(kid, parent, username, name, grade) {
  await addUser(kid, `${username}@kids.learnplaychampion.com`, "2026-01-05T00:00:00Z");
  await db.query(
    "insert into public.kid_accounts(kid_user_id, parent_id, username, display_name, grade) values ($1, $2, $3, $4, $5)",
    [kid, parent, username, name, grade],
  );
  await db.query(
    "insert into public.kid_account_parents(kid_user_id, parent_id) values ($1, $2)",
    [kid, parent],
  );
}
async function logReminder(parent, sentAt) {
  // The parent-reminder function writes with the service role; mirror
  // that path (bypassrls + the grant Supabase gives it).
  await asRole("service_role",
    "insert into public.parent_reminder_log(parent_user_id, sent_at) values ($1, $2)",
    [parent, sentAt]);
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  for (const name of [
    "202610290001_learner_progress.sql",
    "202610290004_payments.sql",
    "202610310001_kid_accounts.sql",
    "202610310002_kid_progress_parent_read.sql",
    "202610310003_kid_tasks.sql",
    "202610310004_kid_account_active.sql",
    "202610310005_kid_account_parents.sql",
    "202611040004_admin_registered_parents.sql",
    "202611090001_parent_reminder_log.sql",
  ]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
  }
  // Supabase grants the service role full table access on top of its
  // bypassrls attribute; mirror that here so the writes below exercise
  // the same path the Edge Function uses.
  await db.exec("grant all on public.parent_reminder_log to service_role;");

  // Table shape: exactly the three columns, with the documented types
  // and nullability.
  const columns = (await db.query(`
    select column_name, data_type, is_nullable
      from information_schema.columns
     where table_schema = 'public' and table_name = 'parent_reminder_log'
     order by ordinal_position
  `)).rows;
  check(columns.map((c) => c.column_name).join(",") === "id,parent_user_id,sent_at",
    "parent_reminder_log has exactly id, parent_user_id, sent_at");
  const byName = Object.fromEntries(columns.map((c) => [c.column_name, c]));
  check(byName.id.data_type === "uuid" && byName.id.is_nullable === "NO", "id is a non-null uuid");
  check(byName.parent_user_id.data_type === "uuid" && byName.parent_user_id.is_nullable === "NO",
    "parent_user_id is a non-null uuid");
  check(byName.sent_at.data_type === "timestamp with time zone" && byName.sent_at.is_nullable === "NO",
    "sent_at is a non-null timestamptz");
  check((await db.query(
    "select relrowsecurity from pg_class where oid = 'public.parent_reminder_log'::regclass",
  )).rows[0].relrowsecurity === true, "Row level security is enabled");

  // The extended function exists exactly once.
  check((await db.query("select count(*)::int as n from pg_proc where proname = 'admin_registered_parents'")).rows[0].n === 1,
    "admin_registered_parents exists exactly once after the extension");

  // One payment admin; three ordinary parents (never reminded,
  // reminded once, reminded twice); one kid login under the
  // once-reminded parent.
  const admin = id(1), never = id(2), once = id(3), twice = id(4);
  await addUser(admin, "admin@example.com", "2026-01-01T00:00:00Z");
  await addUser(never, "never@example.com", "2026-01-02T00:00:00Z");
  await addUser(once, "once@example.com", "2026-01-03T00:00:00Z");
  await addUser(twice, "twice@example.com", "2026-01-04T00:00:00Z");
  await db.query("insert into public.payment_admins values ($1)", [admin]);
  const kid = id(11);
  await addKid(kid, once, "somekid", "Some Kid Name", "3");

  await logReminder(once, "2026-03-01T10:00:00Z");
  await logReminder(twice, "2026-03-02T10:00:00Z");
  await logReminder(twice, "2026-03-05T10:00:00Z");

  // Defaults fill id and sent_at on a bare insert.
  const bare = await asRole("service_role",
    "insert into public.parent_reminder_log(parent_user_id) values ($1) returning id, sent_at",
    [never]);
  check(typeof bare.rows[0].id === "string" && bare.rows[0].id.length === 36,
    "id defaults to a generated uuid");
  check(bare.rows[0].sent_at instanceof Date, "sent_at defaults to the send time");
  await asRole("service_role",
    "delete from public.parent_reminder_log where parent_user_id = $1", [never]);

  // Locked down: with no grants and no policies, client roles can
  // neither read the log nor write to it.
  await assert.rejects(() => asRole("anon",
    "select * from public.parent_reminder_log")); checks++;
  await assert.rejects(() => asRole("authenticated",
    "select * from public.parent_reminder_log")); checks++;
  await assert.rejects(() => asRole("authenticated",
    "insert into public.parent_reminder_log(parent_user_id) values ($1)", [never])); checks++;

  // The service role (what the Edge Function uses) can read the log.
  const serviceRows = await asRole("service_role",
    "select count(*)::int as n from public.parent_reminder_log");
  check(serviceRows.rows[0].n === 3, "The service role can read the log");

  // Guard intact: anon cannot call the function at all; non-admin
  // grown-ups and kid logins are refused (42501) by the guard.
  await db.exec("set role anon");
  await assert.rejects(() => db.query("select * from public.admin_registered_parents()")); checks++;
  await db.exec("reset role");
  await assert.rejects(() => parents(never)); checks++;
  await assert.rejects(() => parents(kid)); checks++;

  // The administrator sees every grown-up — and only grown-ups — with
  // the reminder fields riding along.
  const rows = await parents(admin);
  check(rows.length === 4, "Exactly the four grown-up accounts are listed");
  check(rows.every((row) => row.parent_user_id !== kid), "Kid accounts never appear as rows");
  check(rows.every((row) => Object.keys(row).sort().join(",") ===
    "email,kid_count,last_reminder_at,parent_user_id,registered_at,reminder_count,task_count,task_titles,tasks_done"),
    "Rows carry exactly the nine allowlisted fields");

  const byEmail = Object.fromEntries(rows.map((row) => [row.email, row]));
  check(byEmail["never@example.com"].reminder_count === 0 &&
    byEmail["never@example.com"].last_reminder_at === null,
    "A parent never reminded shows count 0 and a null last sent");
  check(byEmail["once@example.com"].reminder_count === 1 &&
    new Date(byEmail["once@example.com"].last_reminder_at).toISOString() === "2026-03-01T10:00:00.000Z",
    "A parent reminded once shows count 1 and that send's time");
  check(byEmail["twice@example.com"].reminder_count === 2 &&
    new Date(byEmail["twice@example.com"].last_reminder_at).toISOString() === "2026-03-05T10:00:00.000Z",
    "A parent reminded twice shows count 2 and the LATEST send's time");
  check(byEmail["admin@example.com"].reminder_count === 0,
    "The administrator's own row carries a zero reminder count");

  // The pre-existing fields still behave: the once-reminded parent
  // manages the kid, and no kid identity leaks into the payload.
  check(byEmail["once@example.com"].kid_count === 1,
    "Existing fields survive the extension (kid count still correct)");
  const payload = JSON.stringify(rows);
  for (const secret of ["Some Kid Name", "somekid", "display_name", "username"]) {
    check(!payload.includes(secret), `Payload never contains ${secret}`);
  }
} finally {
  await db.close();
}
console.log(`Parent-reminder PostgreSQL checks passed: ${checks}`);
