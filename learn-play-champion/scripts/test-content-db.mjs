import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite(); let checks = 0;
const teacher = "11111111-1111-4111-8111-111111111111";
const admin = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";
const adult = "44444444-4444-4444-8444-444444444444";
const payload = { title: "Garden discovery", grade: "2", kind: "passage", subject: "english",
  passage: "A seed grows into a plant. Watch its leaves unfold.",
  questions: [{ prompt: "What grows?", choices: ["A seed", "A shoe", "A cup"], answer: 0, explanation: "The seed grows into a plant." }] };
async function asRole(role, user, sql, args = []) {
  await db.exec(`set role ${role}; set request.jwt.claim.sub = '${user}';`);
  try { return await db.query(sql, args); } finally { await db.exec("reset role; reset request.jwt.claim.sub;"); }
}
async function rpc(user, name, args = [], role = "authenticated") {
  return (await asRole(role, user, `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as result`, args)).rows[0].result;
}
async function deny(fn) { await assert.rejects(fn); checks++; }
function check(test, note) { assert.ok(test, note); checks++; }
const published = grade => rpc("", "published_teacher_content", [grade, null], "anon");
try {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$; grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  await db.exec(await readFile(new URL("../supabase/migrations/202610290005_teacher_content.sql", import.meta.url), "utf8"));
  for (const id of [teacher, admin, other, adult]) await db.query("insert into auth.users values ($1)", [id]);
  await db.query("insert into public.content_roles values ($1,'teacher'),($2,'admin'),($3,'teacher')", [teacher, admin, other]);
  check(await rpc(teacher, "content_role") === "teacher", "Teacher role comes from trusted table");
  check(await rpc(adult, "content_role") === null, "Ordinary adult cannot author");
  for (const table of ["content_roles", "teacher_content", "content_audit"]) {
    await deny(() => asRole("authenticated", teacher, `select * from public.${table}`));
    await deny(() => asRole("anon", "", `select * from public.${table}`));
  }
  await deny(() => asRole("authenticated", teacher, "insert into public.content_roles values ($1,'admin')", [adult]));
  await deny(() => rpc("", "studio_content", [], "anon"));
  await deny(() => rpc(adult, "save_teacher_content", [null, payload, 0]));
  await deny(() => rpc(adult, "studio_content"));
  for (const invalid of [
    { ...payload, title: "" }, { ...payload, title: "Hi" + " ".repeat(120) },
    { ...payload, grade: "9" }, { ...payload, subject: "secret" },
    { ...payload, author_id: teacher }, { ...payload, status: "published" }, { ...payload, passage: "" },
    { ...payload, kind: "quiz" }, { ...payload, passage: "x".repeat(6001) },
    { ...payload, questions: {} }, { ...payload, questions: Array(6).fill(payload.questions[0]) },
    ...[
      { answer: -1 }, { answer: 0.5 }, { choices: ["Same", "same ", "Other"] },
      { choices: ["Only one"] }, { prompt: "" }, { explanation: "" }, { choices: [1, "b", "c"] },
    ].map(patch => ({ ...payload, questions: [{ ...payload.questions[0], ...patch }] })),
  ]) await deny(() => rpc(teacher, "save_teacher_content", [null, invalid, 0]));
  const entry = await rpc(teacher, "save_teacher_content", [null, payload, 0]);
  check((await published("2")).length === 0, "Draft never appears in public library");
  check((await rpc(teacher, "studio_content"))[0].is_own === true, "Author sees own draft");
  check((await rpc(other, "studio_content")).length === 0, "Other teacher cannot inspect draft");
  await deny(() => rpc(other, "save_teacher_content", [entry, payload, 0]));
  await deny(() => rpc(teacher, "review_teacher_content", [entry, 0, "publish", ""]));
  await rpc(teacher, "review_teacher_content", [entry, 0, "submit", ""]);
  check((await published("2")).length === 0, "Submitted content stays private");
  await deny(() => rpc(teacher, "save_teacher_content", [entry, payload, 1]));
  await deny(() => rpc(teacher, "review_teacher_content", [entry, 1, "publish", ""]));
  await deny(() => rpc(admin, "review_teacher_content", [entry, 0, "publish", ""]));
  await deny(() => rpc(admin, "review_teacher_content", [entry, 1, "reject", ""]));
  await rpc(admin, "review_teacher_content", [entry, 1, "reject", "Please explain the answer."]);
  let saved = (await rpc(teacher, "studio_content"))[0];
  check(saved.status === "rejected" && saved.revision === 2 && saved.review_note.includes("explain"), "Teacher receives review reason");
  await rpc(teacher, "save_teacher_content", [entry, { ...payload, title: "Revised garden discovery" }, 2]);
  await deny(() => rpc(teacher, "save_teacher_content", [entry, payload, 2]));
  await rpc(teacher, "review_teacher_content", [entry, 3, "submit", ""]);
  await rpc(admin, "review_teacher_content", [entry, 4, "publish", "Checked for accuracy and safety."]);
  const list = await published("2");
  check(list.length === 1 && list[0].payload.title === "Revised garden discovery", "Only reviewed saved revision is published");
  check(!JSON.stringify(list).includes(teacher) && !("review_note" in list[0]) && !("author_id" in list[0]), "Public data omits adult identities and review notes");
  check((await published("1")).length === 0, "Published catalog is grade filtered");
  await deny(() => published("invalid"));
  await deny(() => rpc(teacher, "save_teacher_content", [entry, payload, 5]));
  await deny(() => rpc(admin, "save_teacher_content", [entry, payload, 5]));
  await deny(() => rpc(teacher, "review_teacher_content", [entry, 5, "archive", "Remove"]));
  await deny(() => rpc(admin, "review_teacher_content", [entry, 5, "archive", ""]));
  await rpc(admin, "review_teacher_content", [entry, 5, "archive", "Retired practice material."]);
  check((await published("2")).length === 0, "Archiving removes content from future library reads");
  check((await db.query("select count(*)::int as n from public.content_audit where content_id=$1", [entry])).rows[0].n === 7, "Content decisions are audited");
  const removable = await rpc(other, "save_teacher_content", [null, { ...payload, questions: [] }, 0]);
  await rpc(other, "review_teacher_content", [removable, 0, "delete", ""]);
  check((await rpc(other, "studio_content")).length === 0, "Author can permanently delete unused draft");
  const quiz = await rpc(other, "save_teacher_content", [null, { ...payload, kind: "quiz", passage: "" }, 0]);
  await db.query("delete from public.content_roles where user_id=$1", [other]);
  await deny(() => rpc(other, "studio_content"));
  await deny(() => rpc(other, "review_teacher_content", [quiz, 0, "submit", ""]));
  await db.query("delete from auth.users where id=$1", [other]);
  check((await rpc(admin, "studio_content")).find(row => row.id === quiz).is_own === false, "Deleted author identities do not break administrator review");
  // Populate tied/unsorted UUIDs directly as an operator to check keyset paging and the author cap.
  for (let i = 0; i < 100; i++) await db.query(
    "insert into public.teacher_content(author_id,payload,status) values($1,$2,'published')", [teacher, payload]);
  const page = await published("2");
  const older = await rpc("", "published_teacher_content", ["2", page[24].id], "anon");
  check(page.length === 25 && older.length === 25 && !older.some(row => page.some(old => old.id === row.id)), "Public paging is bounded without duplicate entries");
  check((await rpc(admin, "studio_content")).length === 25, "Review queue is bounded");
  await deny(() => rpc(teacher, "save_teacher_content", [null, payload, 0]));
  await db.query("delete from public.content_roles where user_id=$1", [admin]);
  await deny(() => rpc(admin, "studio_content"));
} finally { await db.close(); }
console.log(`Teacher content PostgreSQL checks passed: ${checks}`);
