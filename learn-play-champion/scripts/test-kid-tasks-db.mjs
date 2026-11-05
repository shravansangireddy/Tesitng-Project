// Isolated PostgreSQL checks only. This never connects to a real Supabase project.
// Verifies the kid-only completion rule for kid_tasks: a parent may assign,
// read, retitle, and remove tasks, but ONLY the kid (kid_user_id = auth.uid())
// may change done / completed_at — enforced by the trigger added in
// migration 202611040001_kid_task_completion_kid_only.sql.
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
async function denied(user, sql, args = []) {
  await assert.rejects(() => asUser(user, sql, args));
  checks++;
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
  for (const name of [
    "202610290001_learner_progress.sql",
    "202610310001_kid_accounts.sql",
    "202610310002_kid_progress_parent_read.sql",
    "202610310003_kid_tasks.sql",
    "202610310004_kid_account_active.sql",
    "202610310005_kid_account_parents.sql",
    "202611040001_kid_task_completion_kid_only.sql",
  ]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
  }

  const parent = id(1), kid = id(2), outsider = id(3);
  for (const user of [parent, kid, outsider]) {
    await db.query("insert into auth.users(id) values ($1)", [user]);
  }
  // A kid login owned by the parent, plus the co-parent link row the
  // kid-accounts Edge Function maintains.
  await db.query(
    "insert into public.kid_accounts(kid_user_id, parent_id, username, display_name, grade) values ($1, $2, 'kiddo', 'Kiddo', '2')",
    [kid, parent],
  );
  await db.query(
    "insert into public.kid_account_parents(kid_user_id, parent_id) values ($1, $2)",
    [kid, parent],
  );

  // Parents CAN assign, read, and retitle tasks.
  const inserted = await asUser(parent,
    "insert into public.kid_tasks(kid_user_id, parent_id, title, activity) values ($1, $2, 'Play Math Mountain', 'arithmetic') returning id, done, completed_at",
    [kid, parent]);
  check(inserted.rows[0].done === false && inserted.rows[0].completed_at === null,
    "Parent-created task starts open");
  const taskId = inserted.rows[0].id;
  check((await asUser(parent, "select id from public.kid_tasks where kid_user_id = $1", [kid])).rows.length === 1,
    "Parent can read the kid's tasks");
  await asUser(parent, "update public.kid_tasks set title = 'Play Math Mountain!' where id = $1", [taskId]);
  check((await asUser(parent, "select title from public.kid_tasks where id = $1", [taskId])).rows[0].title === "Play Math Mountain!",
    "Parent can retitle a task");

  // Parents can NEVER complete a task — not by flipping done, not by
  // stamping completed_at, and not by creating one already done.
  await denied(parent, "update public.kid_tasks set done = true where id = $1", [taskId]);
  await denied(parent, "update public.kid_tasks set completed_at = now() where id = $1", [taskId]);
  await denied(parent,
    "insert into public.kid_tasks(kid_user_id, parent_id, title, done) values ($1, $2, 'Pre-done', true)",
    [kid, parent]);
  await denied(parent,
    "insert into public.kid_tasks(kid_user_id, parent_id, title, completed_at) values ($1, $2, 'Pre-stamped', now())",
    [kid, parent]);
  check((await asUser(parent, "select done from public.kid_tasks where id = $1", [taskId])).rows[0].done === false,
    "Task is still open after the parent's attempts");

  // The kid CAN complete (and reopen) their own task.
  check((await asUser(kid, "select id from public.kid_tasks where kid_user_id = $1", [kid])).rows.length === 1,
    "Kid can read their own tasks");
  await asUser(kid, "update public.kid_tasks set done = true, completed_at = now() where id = $1", [taskId]);
  check((await asUser(kid, "select done, completed_at from public.kid_tasks where id = $1", [taskId])).rows[0].done === true,
    "Kid marked their own task done");
  await asUser(kid, "update public.kid_tasks set done = false, completed_at = null where id = $1", [taskId]);
  check((await asUser(kid, "select done from public.kid_tasks where id = $1", [taskId])).rows[0].done === false,
    "Kid can reopen their own task");
  await asUser(kid, "update public.kid_tasks set done = true, completed_at = now() where id = $1", [taskId]);

  // Nobody else can see or touch the task.
  check((await asUser(outsider, "select id from public.kid_tasks where kid_user_id = $1", [kid])).rows.length === 0,
    "Outsider cannot read the kid's tasks");
  check((await asUser(outsider, "update public.kid_tasks set done = false where id = $1 returning id", [taskId])).rows.length === 0,
    "Outsider cannot change the task at all");
  check((await asUser(parent, "select done from public.kid_tasks where id = $1", [taskId])).rows[0].done === true,
    "Kid's completion stands after the outsider's attempt");

  // The service-role seeding path (no auth.uid) still works, and the
  // parent can still remove tasks.
  const seeded = await db.query(
    "insert into public.kid_tasks(kid_user_id, parent_id, title, activity) values ($1, $2, 'Play Story Explorer', 'reading') returning id",
    [kid, parent]);
  check(!!seeded.rows[0].id, "Starter-task seeding insert still works");
  await asUser(parent, "delete from public.kid_tasks where id = $1", [seeded.rows[0].id]);
  await asUser(parent, "delete from public.kid_tasks where id = $1", [taskId]);
  check((await asUser(parent, "select id from public.kid_tasks where kid_user_id = $1", [kid])).rows.length === 0,
    "Parent can remove tasks");
} finally {
  await db.close();
}
console.log(`Kid-task PostgreSQL checks passed: ${checks}`);
