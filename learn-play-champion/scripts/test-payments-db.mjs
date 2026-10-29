import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite(); let checks = 0;
const admin = "11111111-1111-4111-8111-111111111111", adult = "22222222-2222-4222-8222-222222222222";
const id = n => `33333333-3333-4333-8333-${String(n).padStart(12, "0")}`;
async function asUser(user, sql, args = []) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${user}';`);
  try { return await db.query(sql, args); } finally { await db.exec("reset role; reset request.jwt.claim.sub;"); }
}
async function rpc(user, name, args = []) {
  return (await asUser(user, `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as result`, args)).rows[0].result;
}
async function denied(fn) { await assert.rejects(fn); checks++; }
function check(test, note) { assert.ok(test, note); checks++; }
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$; grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  await db.exec(await readFile(new URL("../supabase/migrations/202610290004_payments.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users values ($1),($2)", [admin, adult]);
  check(await rpc(adult, "is_payment_admin") === false, "Ordinary adult has no administrator access");
  await denied(() => rpc(adult, "admin_payment_events"));
  for (const table of ["payment_admins", "donation_orders", "payment_events"]) {
    await denied(() => asUser(adult, `select * from public.${table}`));
  }
  await denied(() => asUser(adult, "insert into public.payment_admins values ($1)", [adult]));
  await denied(() => asUser(adult, "insert into public.payment_events(event_id) values ('FORGED')"));
  await db.exec("set role anon");
  await denied(() => db.query("select public.is_payment_admin()"));
  await denied(() => db.query("select public.admin_payment_events()"));
  await db.exec("reset role");
  await denied(() => rpc("", "begin_donation", [id(1), 500, "sandbox"]));
  for (const amount of [0, 99, 50001, 550]) await denied(() => rpc(adult, "begin_donation", [id(1), amount, "sandbox"]));
  const first = await rpc(adult, "begin_donation", [id(1), 500, "sandbox"]);
  check(first.amount_cents === 500 && first.user_id === adult, "Own donation is fixed at creation");
  check((await rpc(adult, "begin_donation", [id(1), 500, "sandbox"])).capture_request_id === first.capture_request_id, "Retries retain capture idempotency key");
  await denied(() => rpc(admin, "begin_donation", [id(1), 500, "sandbox"]));
  await denied(() => rpc(adult, "begin_donation", [id(1), 1000, "sandbox"]));
  await denied(() => rpc(adult, "begin_donation", [id(1), 500, "live"]));
  for (let n = 2; n <= 5; n++) await rpc(adult, "begin_donation", [id(n), 500, "sandbox"]);
  await denied(() => rpc(adult, "begin_donation", [id(6), 500, "sandbox"]));
  await db.query("insert into public.payment_admins values ($1)", [admin]);
  check(await rpc(admin, "is_payment_admin") === true, "Trusted SQL can assign an administrator");
  check((await rpc(admin, "admin_payment_events")).length === 0, "No fictional payments before verified ingest");
  await db.exec("set role service_role");
  await db.query("update public.donation_orders set paypal_order_id='ORDER123' where id=$1", [id(1)]);
  for (let n = 0; n < 28; n++) {
    await db.query(`insert into public.payment_events(event_id,donation_id,resource_id,event_type,amount_cents,currency,provider_created_at,received_at)
      values ($1,$2,'CAPTURE123','PAYMENT.CAPTURE.COMPLETED',500,'USD',now(),$3)`,
      [`WH-${String(n).padStart(3, "0")}`, id(1), "2026-10-29T12:00:00Z"]);
  }
  await db.exec("reset role");
  await db.exec("set role service_role");
  await db.query(`insert into public.payment_events(event_id,donation_id,resource_id,event_type,amount_cents,currency,provider_created_at)
    values ('WH-027',$1,'CAPTURE123','PAYMENT.CAPTURE.COMPLETED',500,'USD',now())
    on conflict(event_id) do nothing`, [id(1)]);
  await db.exec("reset role");
  check((await db.query("select count(*)::int as n from public.payment_events")).rows[0].n === 28, "Duplicate notification does not duplicate financial history");
  const page = await rpc(admin, "admin_payment_events");
  check(page.length === 25 && page[0].event_id === "WH-027", "Ledger is capped and ordered with ties");
  check(page[0].environment === "sandbox" && !("user_id" in page[0]), "Test mode visible without adult identity");
  const last = page[page.length - 1];
  const older = await rpc(admin, "admin_payment_events", [last.received_at, last.event_id]);
  check(older.length === 3 && !older.some(row => page.some(before => before.event_id === row.event_id)), "Keyset pagination has no repeats or omissions");
  await denied(() => rpc(admin, "admin_payment_events", [last.received_at, null]));
  await db.query("delete from public.payment_admins where user_id=$1", [admin]);
  await denied(() => rpc(admin, "admin_payment_events"));
  await db.query("delete from auth.users where id=$1", [adult]);
  check((await db.query("select user_id from public.donation_orders where id=$1", [id(1)])).rows[0].user_id === null, "Identity deletion unlinks financial records");
  check((await db.query("select count(*)::int as n from public.payment_events")).rows[0].n === 28, "Financial retention is separate from adult/learning deletion");
} finally { await db.close(); }
console.log(`Payments PostgreSQL checks passed: ${checks}`);
