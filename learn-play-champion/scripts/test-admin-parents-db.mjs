// Isolated PostgreSQL checks only. This never connects to a real Supabase project.
// Verifies admin_registered_parents() (migration 202611040004): only a
// server-assigned payment administrator can call it; every grown-up
// account appears with its managed-kid count and those kids' tasks
// (counts + titles with done state, flat under the parent); a kid
// co-managed by two grown-ups counts under both; kid accounts never
// appear as rows; and no kid name or username leaks into the payload.
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
async function linkKid(kid, parent) {
  await db.query(
    "insert into public.kid_account_parents(kid_user_id, parent_id) values ($1, $2)",
    [kid, parent],
  );
}
async function addTask(kid, parent, title, done, createdAt) {
  await db.query(
    "insert into public.kid_tasks(kid_user_id, parent_id, title, done, created_at, completed_at) values ($1, $2, $3, $4, $5, $6)",
    [kid, parent, title, done, createdAt, done ? createdAt : null],
  );
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
  ]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
  }

  // The function exists exactly once.
  check((await db.query("select count(*)::int as n from pg_proc where proname = 'admin_registered_parents'")).rows[0].n === 1,
    "admin_registered_parents exists");

  // One payment admin, two ordinary parents, one grown-up with no
  // kids. Users are inserted out of order to prove the result is
  // ordered by registration time, not insertion order.
  const admin = id(1), parentA = id(2), parentB = id(3), stranger = id(4);
  await addUser(parentB, "b@example.com", "2026-01-03T00:00:00Z");
  await addUser(stranger, "c@example.com", "2026-01-04T00:00:00Z");
  await addUser(admin, "admin@example.com", "2026-01-01T00:00:00Z");
  await addUser(parentA, "a@example.com", "2026-01-02T00:00:00Z");
  await db.query("insert into public.payment_admins values ($1)", [admin]);

  // Kids: one shared by A and B, one only A's, one only B's.
  const kidShared = id(11), kidA = id(12), kidB = id(13);
  await addKid(kidShared, parentA, "sharedkid", "Shared Kid Name", "2");
  await linkKid(kidShared, parentB);
  await addKid(kidA, parentA, "onlyakid", "Only A Kid", "3");
  await addKid(kidB, parentB, "onlybkid", "Only B Kid", "4");

  // Tasks: the shared kid's tasks must surface under BOTH parents.
  await addTask(kidShared, parentA, "Shared Task One", true, "2026-02-01T00:00:00Z");
  await addTask(kidShared, parentA, "Shared Task Two", false, "2026-02-02T00:00:00Z");
  await addTask(kidA, parentA, "A Kid Task", true, "2026-02-03T00:00:00Z");
  await addTask(kidB, parentB, "B Kid Task", false, "2026-02-04T00:00:00Z");

  // Grant surface + gating: anon cannot call it at all; signed-out,
  // non-admin grown-ups, and kid logins are all refused by the guard.
  await db.exec("set role anon");
  await assert.rejects(() => db.query("select * from public.admin_registered_parents()")); checks++;
  await db.exec("reset role");
  await assert.rejects(() => asUser("", "select * from public.admin_registered_parents()")); checks++;
  await assert.rejects(() => parents(parentA)); checks++;
  await assert.rejects(() => parents(kidShared)); checks++;

  // The administrator sees every grown-up — and only grown-ups.
  const rows = await parents(admin);
  check(rows.length === 4, "Exactly the four grown-up accounts are listed");
  check(rows.map((row) => row.email).join(",") === "admin@example.com,a@example.com,b@example.com,c@example.com",
    "Rows are ordered by registration date");
  check(rows.every((row) => ![kidShared, kidA, kidB].includes(row.parent_user_id)),
    "Kid accounts never appear as rows");
  check(rows.every((row) => Object.keys(row).sort().join(",") ===
    "email,kid_count,parent_user_id,registered_at,task_count,task_titles,tasks_done"),
    "Rows carry exactly the seven allowlisted fields");

  const byEmail = Object.fromEntries(rows.map((row) => [row.email, row]));
  check(byEmail["admin@example.com"].registered_at && byEmail["admin@example.com"].kid_count === 0 &&
    byEmail["admin@example.com"].task_count === 0 && byEmail["admin@example.com"].tasks_done === 0 &&
    byEmail["admin@example.com"].task_titles.length === 0,
    "The administrator's own row is present with zero counts");
  check(byEmail["c@example.com"].kid_count === 0 && byEmail["c@example.com"].task_count === 0,
    "A grown-up with no kids appears with zero counts");

  const rowA = byEmail["a@example.com"];
  check(rowA.kid_count === 2 && rowA.task_count === 3 && rowA.tasks_done === 2,
    "Parent A: shared + own kid counted, with their tasks and done count");
  check(rowA.task_titles.map((task) => task.title).join("|") === "Shared Task One|Shared Task Two|A Kid Task",
    "Parent A's task titles arrive in creation order");
  check(rowA.task_titles.map((task) => task.done).join(",") === "true,false,true",
    "Parent A's task done states ride alongside the titles");

  const rowB = byEmail["b@example.com"];
  check(rowB.kid_count === 2 && rowB.task_count === 3 && rowB.tasks_done === 1,
    "Parent B: the co-managed kid counts under B too, tasks included");
  check(rowB.task_titles.map((task) => task.title).join("|") === "Shared Task One|Shared Task Two|B Kid Task",
    "The shared kid's titles appear under both parents");

  // No kid identity leaks anywhere in the payload.
  const payload = JSON.stringify(rows);
  for (const secret of ["Shared Kid Name", "Only A Kid", "Only B Kid",
    "sharedkid", "onlyakid", "onlybkid", "display_name", "username"]) {
    check(!payload.includes(secret), `Payload never contains ${secret}`);
  }
} finally {
  await db.close();
}
console.log(`Admin-parents PostgreSQL checks passed: ${checks}`);
