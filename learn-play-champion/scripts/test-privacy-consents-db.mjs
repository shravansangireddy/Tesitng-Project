// Isolated PostgreSQL checks only. This never connects to a real Supabase project.
// Verifies the stored privacy-policy agreement (migration
// 202611040002_parent_privacy_consents.sql): a signed-in grown-up records
// and withdraws agreement ONLY through the RPCs, reads only their own
// rows, and one row per (account, policy version) is kept.
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
async function rpcRow(user, name, args = []) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
  return (await asUser(user, `select * from public.${name}(${placeholders})`, args)).rows[0];
}
async function denied(user, sql, args = []) {
  await assert.rejects(() => asUser(user, sql, args));
  checks++;
}
async function countFor(user) {
  return (await db.query(
    "select count(*)::integer as n from public.parent_privacy_consents where user_id = $1",
    [user],
  )).rows[0].n;
}

try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  await db.exec(await readFile(
    new URL("../supabase/migrations/202611040002_parent_privacy_consents.sql", import.meta.url),
    "utf8",
  ));

  const parent = id(1), otherParent = id(2);
  for (const user of [parent, otherParent]) {
    await db.query("insert into auth.users(id) values ($1)", [user]);
  }
  const version = "2026-11-04";
  const notice = "https://school.example/privacy";

  // Signed out and anonymous callers cannot record, withdraw, or read.
  await assert.rejects(() => rpcRow("", "record_my_privacy_policy_consent", [version, notice])); checks++;
  await assert.rejects(() => rpcRow("", "withdraw_my_privacy_policy_consent", [version])); checks++;
  await db.exec("set role anon");
  await assert.rejects(() => db.query("select * from public.parent_privacy_consents")); checks++;
  await assert.rejects(() => db.query("select * from public.record_my_privacy_policy_consent($1, $2)", [version, notice])); checks++;
  await db.exec("reset role");

  // An empty policy version is refused even when signed in.
  await assert.rejects(() => rpcRow(parent, "record_my_privacy_policy_consent", ["  ", notice])); checks++;
  await assert.rejects(() => rpcRow(parent, "withdraw_my_privacy_policy_consent", [""])); checks++;
  check(await countFor(parent) === 0, "Refused calls store nothing");

  // Recording returns the stored row, stamped by the server.
  const agreed = await rpcRow(parent, "record_my_privacy_policy_consent", [version, notice]);
  check(agreed.user_id === parent && agreed.policy_version === version,
    "Recorded agreement belongs to the caller and version");
  check(!!agreed.accepted_at && agreed.withdrawn_at === null,
    "Agreement is stamped accepted and not withdrawn");
  check(agreed.notice_url === notice, "Notice URL is stored with the agreement");

  // The parent reads their own row back; nobody else can see it.
  check((await asUser(parent, "select * from public.parent_privacy_consents")).rows.length === 1,
    "Parent can read their own agreement");
  check((await asUser(otherParent, "select * from public.parent_privacy_consents")).rows.length === 0,
    "Another grown-up cannot read the agreement");

  // There is no direct write path — not even on your own rows.
  await denied(parent,
    "insert into public.parent_privacy_consents(user_id, policy_version) values ($1, '1999-01-01')",
    [parent]);
  await denied(parent,
    "update public.parent_privacy_consents set accepted_at = now() - interval '1 year'");
  await denied(parent, "delete from public.parent_privacy_consents");

  // Agreeing again to the same version refreshes the one row.
  const again = await rpcRow(parent, "record_my_privacy_policy_consent", [version, notice]);
  check(again.id === agreed.id && await countFor(parent) === 1,
    "Re-agreeing the same version keeps one row");

  // Withdrawing stamps withdrawn_at on that same row.
  const withdrawn = await rpcRow(parent, "withdraw_my_privacy_policy_consent", [version]);
  check(withdrawn.id === agreed.id && !!withdrawn.withdrawn_at,
    "Withdrawal is recorded on the agreement row");
  const reread = (await asUser(parent, "select * from public.parent_privacy_consents")).rows[0];
  check(!!reread.withdrawn_at, "Parent can retrieve the withdrawal");

  // Re-agreeing after withdrawal clears it, still on the one row.
  const reagreed = await rpcRow(parent, "record_my_privacy_policy_consent", [version, notice]);
  check(reagreed.id === agreed.id && reagreed.withdrawn_at === null && await countFor(parent) === 1,
    "Re-agreeing clears the withdrawal on the same row");

  // Withdrawing a version you never agreed to is a safe no-op.
  const noop = await rpcRow(otherParent, "withdraw_my_privacy_policy_consent", [version]);
  check(!noop || noop.user_id === null, "Withdrawing an agreement that never existed returns no row");
  check(await countFor(otherParent) === 0, "The no-op withdrawal creates nothing");

  // A different policy version is a separate record.
  await rpcRow(parent, "record_my_privacy_policy_consent", ["2027-01-01", notice]);
  check(await countFor(parent) === 2, "Each policy version gets its own row");
  check((await asUser(parent,
    "select * from public.parent_privacy_consents where policy_version = $1", [version])).rows.length === 1,
    "The dashboard's version filter finds exactly the current agreement");

  // Deleting the adult account removes its agreement records.
  await db.query("delete from auth.users where id = $1", [parent]);
  check(await countFor(parent) === 0, "Account deletion removes consent rows");
} finally {
  await db.close();
}
console.log(`Privacy-consent PostgreSQL checks passed: ${checks}`);
