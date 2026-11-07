// Isolated PostgreSQL checks only. This never connects to a real Supabase project.
// Verifies welcome_email_log (migration 202611070001): the table's shape,
// that the unique index enforces the one-send guarantee (a second insert
// of the same (parent, kind, kid) key is rejected, while a different kid
// or a different kind is a different key), and that the table is locked
// to the service role — RLS on, with anon/authenticated unable to read
// or write it.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function addUser(user) {
  await db.query("insert into auth.users(id) values ($1)", [user]);
}
async function logWelcome(user, kind, kid) {
  await db.query(
    "insert into public.welcome_email_log(user_id, kind, kid_user_id) values ($1, $2, $3)",
    [user, kind, kid],
  );
}
async function asRole(role, sql, args = []) {
  await db.exec(`set role ${role};`);
  try { return await db.query(sql, args); }
  finally { await db.exec("reset role;"); }
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, created_at timestamptz not null default now());
  `);
  await db.exec(await readFile(
    new URL("../supabase/migrations/202611070001_welcome_email_log.sql", import.meta.url),
    "utf8",
  ));
  // Supabase grants the service role full table access on top of its
  // bypassrls attribute; mirror that here so the reads below exercise
  // the same path the Edge Functions use.
  await db.exec("grant all on public.welcome_email_log to service_role;");

  // Schema shape: exactly the five columns, with the documented types
  // and nullability.
  const columns = (await db.query(`
    select column_name, data_type, is_nullable
      from information_schema.columns
     where table_schema = 'public' and table_name = 'welcome_email_log'
     order by ordinal_position
  `)).rows;
  check(columns.map((c) => c.column_name).join(",") === "id,user_id,kind,kid_user_id,sent_at",
    "welcome_email_log has exactly id, user_id, kind, kid_user_id, sent_at");
  const byName = Object.fromEntries(columns.map((c) => [c.column_name, c]));
  check(byName.id.data_type === "uuid" && byName.id.is_nullable === "NO", "id is a non-null uuid");
  check(byName.user_id.data_type === "uuid" && byName.user_id.is_nullable === "NO", "user_id is a non-null uuid");
  check(byName.kind.data_type === "text" && byName.kind.is_nullable === "NO", "kind is non-null text");
  check(byName.kid_user_id.data_type === "uuid" && byName.kid_user_id.is_nullable === "YES", "kid_user_id is a nullable uuid");
  check(byName.sent_at.data_type === "timestamp with time zone" && byName.sent_at.is_nullable === "NO",
    "sent_at is a non-null timestamptz");

  // The one-send index exists and is unique; RLS is switched on.
  const index = (await db.query(`
    select indexdef from pg_indexes
     where schemaname = 'public' and tablename = 'welcome_email_log'
       and indexname = 'welcome_email_log_once_idx'
  `)).rows;
  check(index.length === 1 && /unique/i.test(index[0].indexdef),
    "welcome_email_log_once_idx exists and is unique");
  check((await db.query(
    "select relrowsecurity from pg_class where oid = 'public.welcome_email_log'::regclass",
  )).rows[0].relrowsecurity === true, "Row level security is enabled");

  const parent = id(1), kidOne = id(11), kidTwo = id(12);
  await addUser(parent);
  await addUser(kidOne);
  await addUser(kidTwo);

  // Defaults fill id and sent_at; a parent welcome and per-kid welcomes
  // land as separate keys.
  await logWelcome(parent, "parent_welcome", null);
  const first = (await db.query(
    "select id, sent_at from public.welcome_email_log where user_id = $1", [parent],
  )).rows[0];
  check(typeof first.id === "string" && first.id.length === 36, "id defaults to a generated uuid");
  check(first.sent_at instanceof Date, "sent_at defaults to the send time");
  await logWelcome(parent, "kid_welcome", kidOne);
  await logWelcome(parent, "kid_welcome", kidTwo);
  check((await db.query("select count(*)::int as n from public.welcome_email_log")).rows[0].n === 3,
    "Parent welcome plus two different kids are three different keys");

  // The guarantee itself: the same key a second time is rejected —
  // including the NULL-kid key, where a naive unique index over the raw
  // columns would have let duplicates through.
  await assert.rejects(() => logWelcome(parent, "parent_welcome", null)); checks++;
  await assert.rejects(() => logWelcome(parent, "kid_welcome", kidOne)); checks++;

  // An unknown kind is rejected by the check constraint.
  await assert.rejects(() => logWelcome(parent, "birthday_card", null)); checks++;

  // Locked down: with no grants and no policies, client roles can
  // neither read the log nor write to it.
  await assert.rejects(() => asRole("anon",
    "select * from public.welcome_email_log")); checks++;
  await assert.rejects(() => asRole("authenticated",
    "select * from public.welcome_email_log")); checks++;
  await assert.rejects(() => asRole("authenticated",
    "insert into public.welcome_email_log(user_id, kind) values ($1, 'parent_welcome')",
    [parent])); checks++;

  // The service role (what the Edge Functions use) can read the log.
  const serviceRows = await asRole("service_role",
    "select count(*)::int as n from public.welcome_email_log");
  check(serviceRows.rows[0].n === 3, "The service role can read the log");
} finally {
  await db.close();
}
console.log(`Welcome-email PostgreSQL checks passed: ${checks}`);
